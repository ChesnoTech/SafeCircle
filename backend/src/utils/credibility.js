/**
 * Credibility scoring system — rewards helpful users and flags bad actors.
 * All point values are configurable via environment variables.
 */

export const CREDIBILITY_EVENTS = {
  report_created: parseInt(process.env.CREDIBILITY_REPORT_CREATED || '2'),
  sighting_confirmed: parseInt(process.env.CREDIBILITY_SIGHTING_CONFIRMED || '5'),
  item_returned: parseInt(process.env.CREDIBILITY_ITEM_RETURNED || '10'),
  person_found: parseInt(process.env.CREDIBILITY_PERSON_FOUND || '15'),
  verified_claim: parseInt(process.env.CREDIBILITY_VERIFIED_CLAIM || '5'),
  report_resolved: parseInt(process.env.CREDIBILITY_REPORT_RESOLVED || '3'),
  false_report: parseInt(process.env.CREDIBILITY_FALSE_REPORT || '-20'),
  community_flag: parseInt(process.env.CREDIBILITY_COMMUNITY_FLAG || '-5'),
};

/**
 * Record a credibility event and recalculate the user's score.
 *
 * @param {object} db - Fastify pg pool (fastify.db)
 * @param {string} userId - UUID of the user
 * @param {string} eventType - One of the keys in CREDIBILITY_EVENTS
 * @param {string|null} reason - Optional human-readable reason
 * @returns {number} The user's new credibility score
 */
export async function updateCredibility(db, userId, eventType, reason = null) {
  const points = CREDIBILITY_EVENTS[eventType];
  if (points === undefined) {
    throw new Error(`Unknown credibility event type: ${eventType}`);
  }

  // Insert the event
  await db.query(
    `INSERT INTO credibility_events (user_id, event_type, points, reason)
     VALUES ($1, $2, $3, $4)`,
    [userId, eventType, points, reason]
  );

  // Recalculate and update the user's score (clamped 0–100, base 50)
  const result = await db.query(
    `UPDATE users
     SET credibility_score = GREATEST(0, LEAST(100,
       (SELECT COALESCE(SUM(points), 0) FROM credibility_events WHERE user_id = $1) + 50
     ))
     WHERE id = $1
     RETURNING credibility_score`,
    [userId]
  );

  return result.rows[0].credibility_score;
}
