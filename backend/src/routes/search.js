import { config } from '../config/index.js';

export async function searchRoutes(fastify) {
  // --- Unified search across reports, items, and intel ---
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 2, maxLength: config.maxStringLength },
          type: { type: 'string', enum: ['all', 'missing', 'lost', 'found'] },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radius_km: { type: 'integer', minimum: 1, maximum: config.maxRadiusKm },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: config.searchPageSize },
        },
      },
    },
  }, async (request) => {
    const { q, type = 'all', latitude, longitude, radius_km, page = 1, limit = config.searchPageSize } = request.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${q}%`;
    const results = {};

    // Search missing reports
    if (type === 'all' || type === 'missing') {
      const params = [searchTerm, limit, offset];
      let geoClause = '';

      if (latitude && longitude && radius_km) {
        const point = `SRID=4326;POINT(${longitude} ${latitude})`;
        geoClause = `AND ST_DWithin(last_seen_location, ST_GeogFromText($${params.length + 1}), $${params.length + 2} * 1000)`;
        params.push(point, radius_km);
      }

      const missing = await fastify.db.query(
        `SELECT id, name, age, gender, photo_url, status,
                ST_Y(last_seen_location::geometry) AS latitude,
                ST_X(last_seen_location::geometry) AS longitude,
                created_at
         FROM missing_reports
         WHERE (name ILIKE $1 OR clothing_description ILIKE $1 OR circumstances ILIKE $1)
           AND deleted_at IS NULL
           ${geoClause}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        params
      );
      results.missing = missing.rows;
    }

    // Search lost items
    if (type === 'all' || type === 'lost') {
      const params = [searchTerm, limit, offset];
      let geoClause = '';

      if (latitude && longitude && radius_km) {
        const point = `SRID=4326;POINT(${longitude} ${latitude})`;
        geoClause = `AND ST_DWithin(location, ST_GeogFromText($${params.length + 1}), $${params.length + 2} * 1000)`;
        params.push(point, radius_km);
      }

      const lost = await fastify.db.query(
        `SELECT id, category, description, color, brand, status,
                ST_Y(location::geometry) AS latitude,
                ST_X(location::geometry) AS longitude,
                created_at
         FROM lost_items
         WHERE (description ILIKE $1 OR category ILIKE $1 OR brand ILIKE $1 OR color ILIKE $1)
           ${geoClause}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        params
      );
      results.lost = lost.rows;
    }

    // Search found items
    if (type === 'all' || type === 'found') {
      const params = [searchTerm, limit, offset];
      let geoClause = '';

      if (latitude && longitude && radius_km) {
        const point = `SRID=4326;POINT(${longitude} ${latitude})`;
        geoClause = `AND ST_DWithin(location, ST_GeogFromText($${params.length + 1}), $${params.length + 2} * 1000)`;
        params.push(point, radius_km);
      }

      const found = await fastify.db.query(
        `SELECT id, category, description, color, brand, status,
                ST_Y(location::geometry) AS latitude,
                ST_X(location::geometry) AS longitude,
                created_at
         FROM found_items
         WHERE (description ILIKE $1 OR category ILIKE $1 OR brand ILIKE $1 OR color ILIKE $1)
           ${geoClause}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        params
      );
      results.found = found.rows;
    }

    return results;
  });
}
