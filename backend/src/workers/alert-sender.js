import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { getAlertTier, formatNotification } from '../utils/notifications.js';

const QUEUE_NAME = 'alert';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const FCM_V1_SEND_URL = `${config.fcmApiUrl}/projects/${config.fcmProjectId}/messages:send`;

/**
 * Build a Redis key for tracking daily notification count per user.
 * Format: notif:daily:{userId}:{YYYY-MM-DD}
 */
function dailyCountKey(userId, date) {
  const d = date || new Date();
  const dateStr = d.toISOString().slice(0, 10);
  return `notif:daily:${userId}:${dateStr}`;
}

/**
 * Send a batch of FCM messages using the FCM HTTP v1 API.
 * Processes up to config.fcmBatchSize tokens per call.
 *
 * @param {string[]} tokens - FCM device tokens
 * @param {object} notification - { title, body }
 * @param {object} data - Arbitrary key-value data payload
 * @param {object} tierConfig - { ttl, priority, sound, vibrate }
 * @returns {Promise<{ success: string[], failed: string[] }>}
 */
async function sendFcmBatch(tokens, notification, data, tierConfig) {
  const success = [];
  const failed = [];

  if (!config.fcmServerKey) {
    // No FCM key configured — skip sending but log
    return { success, failed, skippedReason: 'FCM_SERVER_KEY not configured' };
  }

  const batchSize = config.fcmBatchSize;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    const promises = batch.map(async (token) => {
      const message = {
        message: {
          token,
          notification: notification.title
            ? { title: notification.title, body: notification.body }
            : undefined,
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
          android: {
            priority: tierConfig.priority === 'high' ? 'HIGH' : 'NORMAL',
            ttl: `${tierConfig.ttl}s`,
            notification: notification.title ? {
              sound: tierConfig.sound || undefined,
              channel_id: tierConfig.priority === 'high' ? 'critical_alerts' : 'default',
            } : undefined,
          },
          apns: {
            headers: {
              'apns-priority': tierConfig.priority === 'high' ? '10' : '5',
              'apns-expiration': String(Math.floor(Date.now() / 1000) + tierConfig.ttl),
            },
            payload: {
              aps: {
                alert: notification.title
                  ? { title: notification.title, body: notification.body }
                  : undefined,
                sound: tierConfig.sound || undefined,
                'content-available': 1,
              },
            },
          },
          webpush: notification.title ? {
            notification: {
              title: notification.title,
              body: notification.body,
              vibrate: tierConfig.vibrate ? [200, 100, 200] : undefined,
            },
          } : undefined,
        },
      };

      try {
        const response = await fetch(FCM_V1_SEND_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          success.push(token);
        } else {
          const errorBody = await response.json().catch(() => ({}));
          const errorCode = errorBody?.error?.details?.[0]?.errorCode
            || errorBody?.error?.status
            || '';
          // Mark tokens that are permanently invalid for removal
          if (
            errorCode === 'UNREGISTERED' ||
            errorCode === 'INVALID_ARGUMENT' ||
            response.status === 404
          ) {
            failed.push(token);
          }
        }
      } catch {
        // Network error — don't mark token as failed (transient)
      }
    });

    await Promise.allSettled(promises);
  }

  return { success, failed };
}

/**
 * Create and start the alert-sender BullMQ worker.
 * Expects a PostgreSQL pool (db) to be passed in for querying users and tokens.
 *
 * @param {import('pg').Pool} db - PostgreSQL connection pool
 * @returns {Worker} The BullMQ worker instance
 */
export function createAlertWorker(db) {
  const redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
  });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { reportId, reportType, latitude, longitude, radiusKm, tier: tierOverride } = job.data;

      const log = {
        jobId: job.id,
        reportId,
        reportType,
        sent: 0,
        failed: 0,
        skipped: 0,
      };

      // 1. Determine the notification tier
      const tierName = tierOverride || getAlertTier({
        type: reportType,
        ...job.data,
      });

      // 2. Fetch the report details for notification formatting
      let report = { id: reportId, type: reportType };
      try {
        const reportQuery = reportType === 'missing_person'
          ? `SELECT id, name, age, last_seen_address AS address FROM missing_reports WHERE id = $1`
          : reportType === 'lost_item' || reportType === 'found_item'
            ? `SELECT id, title AS name, NULL AS age, location_address AS address FROM lost_found_items WHERE id = $1`
            : `SELECT id, title AS name, NULL AS age, NULL AS address FROM intel_reports WHERE id = $1`;

        const reportResult = await db.query(reportQuery, [reportId]);
        if (reportResult.rows.length > 0) {
          report = { ...report, ...reportResult.rows[0] };
        }
      } catch {
        // If report fetch fails, proceed with minimal data
      }

      // 3. Query eligible users within radius who have FCM tokens
      //    - Within geographic radius
      //    - Have an active FCM token
      //    - Haven't exceeded daily notification limit
      //    - Have the relevant notification type enabled in preferences
      const notifTypeColumn = {
        missing_person: 'pref_missing_persons',
        lost_item: 'pref_lost_found',
        found_item: 'pref_lost_found',
        intel: 'pref_intel',
      }[reportType] || 'TRUE';

      const point = `SRID=4326;POINT(${longitude} ${latitude})`;

      let eligibleUsers;
      try {
        const result = await db.query(
          `SELECT dt.user_id, dt.token, dt.platform, u.language
           FROM device_tokens dt
           JOIN users u ON u.id = dt.user_id AND u.deleted_at IS NULL
           LEFT JOIN notification_preferences np ON np.user_id = dt.user_id
           WHERE dt.active = true
             AND u.last_known_location IS NOT NULL
             AND ST_DWithin(u.last_known_location, ST_GeogFromText($1), $2 * 1000)
             AND (np.user_id IS NULL OR np.${notifTypeColumn} = true)
             AND (
               np.user_id IS NULL
               OR $2 <= COALESCE(np.radius_km, $3)
             )
           ORDER BY dt.user_id`,
          [point, radiusKm, config.defaultRadiusKm]
        );
        eligibleUsers = result.rows;
      } catch (err) {
        console.error(`[alert-sender] DB query failed for job ${job.id}:`, err.message);
        throw err; // Retry the job
      }

      // 4. Filter by daily notification limit using Redis
      const redis = redisConnection;
      const maxDaily = config.maxDailyNotifications;
      const tokensToSend = [];
      const userLocales = new Map();

      for (const row of eligibleUsers) {
        const key = dailyCountKey(row.user_id);
        const count = parseInt(await redis.get(key) || '0', 10);

        if (count >= maxDaily) {
          log.skipped++;
          continue;
        }

        tokensToSend.push(row.token);
        userLocales.set(row.token, row.language || 'en');
      }

      if (tokensToSend.length === 0) {
        console.info(`[alert-sender] Job ${job.id}: no eligible recipients (${log.skipped} skipped by daily limit)`);
        return log;
      }

      // 5. Group tokens by locale for localized messages
      const tokensByLocale = new Map();
      for (const token of tokensToSend) {
        const locale = userLocales.get(token) || 'en';
        if (!tokensByLocale.has(locale)) {
          tokensByLocale.set(locale, []);
        }
        tokensByLocale.get(locale).push(token);
      }

      // 6. Send FCM notifications per locale group
      const allFailed = [];

      for (const [locale, tokens] of tokensByLocale) {
        const notification = formatNotification(report, tierName, locale);
        const { success, failed } = await sendFcmBatch(
          tokens,
          { title: notification.title, body: notification.body },
          notification.data,
          notification.tier,
        );

        log.sent += success.length;
        log.failed += failed.length;
        allFailed.push(...failed);

        // Increment daily counter for successfully notified users
        for (const token of success) {
          // Find user_id for this token to increment their counter
          const user = eligibleUsers.find((u) => u.token === token);
          if (user) {
            const key = dailyCountKey(user.user_id);
            await redis.incr(key);
            // Set expiry to end of day (24h from now as safe upper bound)
            await redis.expire(key, 86400);
          }
        }
      }

      // 7. Remove invalid/expired FCM tokens from database
      if (allFailed.length > 0) {
        try {
          await db.query(
            `UPDATE device_tokens SET active = false WHERE token = ANY($1::text[])`,
            [allFailed]
          );
        } catch (err) {
          console.error(`[alert-sender] Failed to deactivate invalid tokens:`, err.message);
        }
      }

      console.info(
        `[alert-sender] Job ${job.id} complete: sent=${log.sent}, failed=${log.failed}, skipped=${log.skipped}`
      );

      return log;
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.ALERT_WORKER_CONCURRENCY || '3', 10),
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[alert-sender] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[alert-sender] Worker error:', err.message);
  });

  return worker;
}

export { QUEUE_NAME, dailyCountKey };
