import { config } from '../config/index.js';

export async function intelRoutes(fastify) {
  // --- Submit anonymous report (NO auth required) ---
  fastify.post('/report', {
    config: { rateLimit: { max: config.intelRateLimit, timeWindow: '1 hour' } },
    schema: {
      body: {
        type: 'object',
        required: ['category', 'description', 'latitude', 'longitude'],
        properties: {
          category: { type: 'string', maxLength: config.maxStringLength },
          subcategory: { type: 'string', maxLength: config.maxStringLength },
          description: { type: 'string', minLength: 10, maxLength: config.maxStringLength },
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          address: { type: 'string', maxLength: config.maxStringLength },
          photo_url: { type: 'string', maxLength: config.maxStringLength },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
      },
    },
  }, async (request, reply) => {
    const { latitude, longitude, ...data } = request.body;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    // NO reporter_id — structural anonymity
    const result = await fastify.db.query(
      `INSERT INTO intel_reports (category, subcategory, description, location,
        address, photo_url, severity)
       VALUES ($1, $2, $3, ST_GeogFromText($4), $5, $6, $7)
       RETURNING id, category, created_at`,
      [
        data.category, data.subcategory, data.description,
        point, data.address, data.photo_url, data.severity || 'medium',
      ]
    );

    reply.code(201);
    return { submitted: true, id: result.rows[0].id };
  });

  // --- Get patterns (moderator+ only) ---
  fastify.get('/patterns', {
    preHandler: [fastify.requireRole('moderator', 'law_enforcement', 'admin')],
  }, async (request) => {
    const { status, limit = 50 } = request.query;

    let query = `
      SELECT p.*,
             ST_Y(p.center::geometry) AS latitude,
             ST_X(p.center::geometry) AS longitude
      FROM patterns p`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE p.status = $1`;
    }

    query += ` ORDER BY p.last_seen DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await fastify.db.query(query, params);
    return { patterns: result.rows };
  });

  // --- Get intel heatmap data (public, aggregated only) ---
  fastify.get('/heatmap', {
    schema: {
      querystring: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          radius_km: { type: 'integer', default: 10 },
        },
      },
    },
  }, async (request) => {
    const { latitude, longitude, radius_km = 10 } = request.query;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    // Return aggregated grid cells, NOT individual reports
    const result = await fastify.db.query(
      `SELECT
          ST_Y(ST_Centroid(ST_SnapToGrid(location::geometry, 0.005))) AS latitude,
          ST_X(ST_Centroid(ST_SnapToGrid(location::geometry, 0.005))) AS longitude,
          COUNT(*) AS report_count,
          mode() WITHIN GROUP (ORDER BY category) AS top_category
       FROM intel_reports
       WHERE ST_DWithin(location, ST_GeogFromText($1), $2 * 1000)
         AND created_at > NOW() - INTERVAL '90 days'
       GROUP BY ST_SnapToGrid(location::geometry, 0.005)
       HAVING COUNT(*) >= 3`,
      [point, radius_km]
    );

    return { cells: result.rows };
  });
}
