import { config } from '../config/index.js';

export async function analyticsRoutes(fastify) {
  // --- Platform statistics ---
  fastify.get('/stats', async () => {
    const [missing, lost, found, sightings, resolved] = await Promise.all([
      fastify.db.query('SELECT COUNT(*) AS count FROM missing_reports WHERE deleted_at IS NULL'),
      fastify.db.query('SELECT COUNT(*) AS count FROM lost_items'),
      fastify.db.query('SELECT COUNT(*) AS count FROM found_items'),
      fastify.db.query('SELECT COUNT(*) AS count FROM sightings'),
      fastify.db.query("SELECT COUNT(*) AS count FROM missing_reports WHERE status = 'resolved' AND deleted_at IS NULL"),
    ]);

    return {
      missing: parseInt(missing.rows[0].count),
      lost: parseInt(lost.rows[0].count),
      found: parseInt(found.rows[0].count),
      sightings: parseInt(sightings.rows[0].count),
      resolved: parseInt(resolved.rows[0].count),
    };
  });

  // --- Heatmap data (geographic clusters of recent activity) ---
  fastify.get('/heatmap', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 90, default: config.analyticsTrendingDays },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: config.analyticsHeatmapLimit },
        },
      },
    },
  }, async (request) => {
    const { days = config.analyticsTrendingDays, limit = config.analyticsHeatmapLimit } = request.query;

    const result = await fastify.db.query(
      `SELECT
         ST_Y(last_seen_location::geometry) AS latitude,
         ST_X(last_seen_location::geometry) AS longitude,
         status,
         created_at
       FROM missing_reports
       WHERE last_seen_location IS NOT NULL
         AND deleted_at IS NULL
         AND created_at >= NOW() - INTERVAL '1 day' * $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [days, limit]
    );

    return { points: result.rows };
  });

  // --- Trending areas (locations with most recent reports) ---
  fastify.get('/trending', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 90, default: config.analyticsTrendingDays },
        },
      },
    },
  }, async (request) => {
    const { days = config.analyticsTrendingDays } = request.query;

    // Grid-cell aggregation to find hotspots
    const result = await fastify.db.query(
      `SELECT
         ROUND(ST_Y(last_seen_location::geometry)::numeric, 2) AS lat_grid,
         ROUND(ST_X(last_seen_location::geometry)::numeric, 2) AS lng_grid,
         COUNT(*) AS report_count,
         MAX(created_at) AS latest_report
       FROM missing_reports
       WHERE last_seen_location IS NOT NULL
         AND deleted_at IS NULL
         AND created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY lat_grid, lng_grid
       ORDER BY report_count DESC
       LIMIT 20`,
      [days]
    );

    return { areas: result.rows };
  });
}
