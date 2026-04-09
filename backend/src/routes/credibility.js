import { config } from '../config/index.js';

export async function credibilityRoutes(fastify) {
  // --- Get current user's credibility score + recent events ---
  fastify.get('/score', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = request.user.id;

    const scoreResult = await fastify.db.query(
      'SELECT credibility_score FROM users WHERE id = $1',
      [userId]
    );

    const eventsResult = await fastify.db.query(
      `SELECT id, event_type, points, reason, created_at
       FROM credibility_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, config.credibilityRecentEventsLimit]
    );

    return {
      score: scoreResult.rows[0]?.credibility_score ?? 50,
      events: eventsResult.rows,
    };
  });

  // --- Public leaderboard: top users by credibility ---
  fastify.get('/leaderboard', async () => {
    const result = await fastify.db.query(
      `SELECT name, credibility_score
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY credibility_score DESC
       LIMIT $1`,
      [config.credibilityLeaderboardLimit]
    );

    return { leaderboard: result.rows };
  });
}
