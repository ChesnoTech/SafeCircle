import { config } from '../config/index.js';

export async function lostFoundRoutes(fastify) {
  // --- Report lost item ---
  fastify.post('/lost', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['category', 'description', 'latitude', 'longitude'],
        properties: {
          category: { type: 'string', maxLength: config.maxStringLength },
          color: { type: 'string', maxLength: 50 },
          brand: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: config.maxStringLength },
          photo_url: { type: 'string', maxLength: config.maxStringLength },
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          lost_address: { type: 'string', maxLength: config.maxStringLength },
          lost_time_from: { type: 'string', format: 'date-time' },
          lost_time_to: { type: 'string', format: 'date-time' },
          reward: { type: 'integer', default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    const { latitude, longitude, ...data } = request.body;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    const result = await fastify.db.query(
      `INSERT INTO lost_items (reporter_id, category, description, photo_url,
        lost_location, lost_address, lost_time_from, lost_time_to, reward)
       VALUES ($1, $2, $3, $4, ST_GeogFromText($5), $6, $7, $8, $9)
       RETURNING *`,
      [
        request.user.id, data.category, data.description, data.photo_url,
        point, data.lost_address, data.lost_time_from, data.lost_time_to,
        data.reward || 0,
      ]
    );

    reply.code(201);
    return result.rows[0];
  });

  // --- Report found item ---
  fastify.post('/found', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['category', 'description', 'latitude', 'longitude'],
        properties: {
          category: { type: 'string', maxLength: config.maxStringLength },
          color: { type: 'string', maxLength: 50 },
          brand: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: config.maxStringLength },
          photo_url: { type: 'string', maxLength: config.maxStringLength },
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          found_address: { type: 'string', maxLength: config.maxStringLength },
          found_time: { type: 'string', format: 'date-time' },
          willing_to_hold: { type: 'boolean', default: true },
          handoff_preference: { type: 'string', default: 'in_person' },
        },
      },
    },
  }, async (request, reply) => {
    const { latitude, longitude, ...data } = request.body;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    const result = await fastify.db.query(
      `INSERT INTO found_items (finder_id, category, description, photo_url,
        found_location, found_address, found_time, willing_to_hold, handoff_preference)
       VALUES ($1, $2, $3, $4, ST_GeogFromText($5), $6, $7, $8, $9)
       RETURNING *`,
      [
        request.user.id, data.category, data.description, data.photo_url,
        point, data.found_address, data.found_time,
        data.willing_to_hold ?? true, data.handoff_preference || 'in_person',
      ]
    );

    const foundItem = result.rows[0];

    // Auto-match against lost items
    const matches = await fastify.db.query(
      'SELECT * FROM find_matches_for_found_item($1)',
      [foundItem.id]
    );

    // Insert matches with score > 0.5
    for (const match of matches.rows.filter(m => m.score > 0.5)) {
      await fastify.db.query(
        'INSERT INTO matches (lost_item_id, found_item_id, score) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [match.lost_item_id, foundItem.id, match.score]
      );
    }

    reply.code(201);
    return { item: foundItem, matches_found: matches.rows.length };
  });

  // --- Search lost items near location ---
  fastify.get('/lost/nearby', {
    schema: {
      querystring: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          radius_km: { type: 'integer', default: 5 },
          category: { type: 'string', maxLength: config.maxStringLength },
          limit: { type: 'integer', default: 50 },
        },
      },
    },
  }, async (request) => {
    const { latitude, longitude, radius_km = 5, category, limit = 50 } = request.query;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    let query = `
      SELECT l.*, ST_Y(l.lost_location::geometry) AS latitude,
             ST_X(l.lost_location::geometry) AS longitude,
             ST_Distance(l.lost_location, ST_GeogFromText($1)) AS distance_m
      FROM lost_items l
      WHERE l.status = 'available'
        AND ST_DWithin(l.lost_location, ST_GeogFromText($1), $2 * 1000)`;
    const params = [point, radius_km];

    if (category) {
      params.push(category);
      query += ` AND l.category = $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await fastify.db.query(query, params);
    return { items: result.rows, count: result.rows.length };
  });

  // --- Search found items near location ---
  fastify.get('/found/nearby', {
    schema: {
      querystring: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          radius_km: { type: 'integer', default: 5 },
          category: { type: 'string', maxLength: config.maxStringLength },
          limit: { type: 'integer', default: 50 },
        },
      },
    },
  }, async (request) => {
    const { latitude, longitude, radius_km = 5, category, limit = 50 } = request.query;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    let query = `
      SELECT f.*, ST_Y(f.found_location::geometry) AS latitude,
             ST_X(f.found_location::geometry) AS longitude,
             ST_Distance(f.found_location, ST_GeogFromText($1)) AS distance_m
      FROM found_items f
      WHERE f.status = 'available'
        AND ST_DWithin(f.found_location, ST_GeogFromText($1), $2 * 1000)`;
    const params = [point, radius_km];

    if (category) {
      params.push(category);
      query += ` AND f.category = $${params.length}`;
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await fastify.db.query(query, params);
    return { items: result.rows, count: result.rows.length };
  });

  // --- Get matches for a lost item ---
  fastify.get('/lost/:id/matches', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const result = await fastify.db.query(
      `SELECT m.*, f.category, f.description, f.photo_url, f.found_address,
              ST_Y(f.found_location::geometry) AS latitude,
              ST_X(f.found_location::geometry) AS longitude
       FROM matches m
       JOIN found_items f ON f.id = m.found_item_id
       WHERE m.lost_item_id = $1
       ORDER BY m.score DESC`,
      [request.params.id]
    );
    return { matches: result.rows };
  });
}
