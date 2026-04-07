import { config } from '../config/index.js';

export async function notificationRoutes(fastify) {
  // --- Register / update FCM token ---
  fastify.put('/token', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['token', 'platform'],
        properties: {
          token: { type: 'string', minLength: 1, maxLength: config.maxStringLength },
          platform: { type: 'string', enum: ['ios', 'android', 'web'] },
          language: { type: 'string', minLength: 2, maxLength: 5, default: 'en' },
        },
      },
    },
  }, async (request, reply) => {
    const { token, platform, language } = request.body;
    const userId = request.user.id;

    // Upsert: insert or update on conflict (same token)
    await fastify.db.query(
      `INSERT INTO device_tokens (user_id, token, platform, language, active, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (token) DO UPDATE SET
         user_id = $1,
         platform = $3,
         language = $4,
         active = true,
         updated_at = NOW()`,
      [userId, token, platform, language || 'en']
    );

    return { ok: true };
  });

  // --- Remove FCM token (logout / uninstall) ---
  fastify.delete('/token', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', minLength: 1, maxLength: config.maxStringLength },
        },
      },
    },
  }, async (request, reply) => {
    const { token } = request.body;
    const userId = request.user.id;

    const result = await fastify.db.query(
      `UPDATE device_tokens SET active = false, updated_at = NOW()
       WHERE token = $1 AND user_id = $2
       RETURNING id`,
      [token, userId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Token not found' });
    }

    return { ok: true };
  });

  // --- Get notification preferences ---
  fastify.get('/preferences', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = request.user.id;

    const result = await fastify.db.query(
      `SELECT pref_missing_persons, pref_lost_found, pref_intel,
              radius_km, quiet_hours_start, quiet_hours_end
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no preferences row exists yet
      return {
        missingPersons: true,
        lostFound: true,
        intel: true,
        radiusKm: config.defaultRadiusKm,
        quietHoursStart: null,
        quietHoursEnd: null,
      };
    }

    const row = result.rows[0];
    return {
      missingPersons: row.pref_missing_persons,
      lostFound: row.pref_lost_found,
      intel: row.pref_intel,
      radiusKm: row.radius_km,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
    };
  });

  // --- Update notification preferences ---
  fastify.put('/preferences', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          missingPersons: { type: 'boolean' },
          lostFound: { type: 'boolean' },
          intel: { type: 'boolean' },
          radiusKm: {
            type: 'integer',
            minimum: 1,
            maximum: config.maxRadiusKm,
          },
          quietHoursStart: {
            type: 'string',
            pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
            description: 'HH:MM format in 24h (user local time)',
          },
          quietHoursEnd: {
            type: 'string',
            pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
            description: 'HH:MM format in 24h (user local time)',
          },
        },
      },
    },
  }, async (request) => {
    const userId = request.user.id;
    const {
      missingPersons,
      lostFound,
      intel,
      radiusKm,
      quietHoursStart,
      quietHoursEnd,
    } = request.body;

    // Upsert preferences
    await fastify.db.query(
      `INSERT INTO notification_preferences (
         user_id, pref_missing_persons, pref_lost_found, pref_intel,
         radius_km, quiet_hours_start, quiet_hours_end, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         pref_missing_persons = COALESCE($2, notification_preferences.pref_missing_persons),
         pref_lost_found = COALESCE($3, notification_preferences.pref_lost_found),
         pref_intel = COALESCE($4, notification_preferences.pref_intel),
         radius_km = COALESCE($5, notification_preferences.radius_km),
         quiet_hours_start = COALESCE($6, notification_preferences.quiet_hours_start),
         quiet_hours_end = COALESCE($7, notification_preferences.quiet_hours_end),
         updated_at = NOW()`,
      [
        userId,
        missingPersons ?? true,
        lostFound ?? true,
        intel ?? true,
        radiusKm ?? config.defaultRadiusKm,
        quietHoursStart ?? null,
        quietHoursEnd ?? null,
      ]
    );

    return { ok: true };
  });
}
