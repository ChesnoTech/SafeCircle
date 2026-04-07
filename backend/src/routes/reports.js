import { getGridCellsInRadius } from '../utils/geo.js';
import { config } from '../config/index.js';

export async function reportRoutes(fastify) {
  // --- Create missing person report ---
  fastify.post('/missing', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'photo_url', 'latitude', 'longitude'],
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          gender: { type: 'string', enum: ['male', 'female', 'other', 'unknown'] },
          photo_url: { type: 'string' },
          description: { type: 'object' },
          skin_tone: { type: 'integer', minimum: 1, maximum: 10 },
          hair_color: { type: 'string' },
          eye_color: { type: 'string' },
          height_min_cm: { type: 'integer' },
          height_max_cm: { type: 'integer' },
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          last_seen_address: { type: 'string', maxLength: config.maxStringLength },
          last_seen_at: { type: 'string', format: 'date-time' },
          clothing_description: { type: 'string' },
          circumstances: { type: 'string' },
          alert_radius_km: { type: 'integer', default: 5 },
          country_extension: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { latitude, longitude, alert_radius_km = 5, ...data } = request.body;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    const result = await fastify.db.query(
      `INSERT INTO missing_reports (
        reporter_id, name, age, gender, photo_url, description,
        skin_tone, hair_color, eye_color, height_min_cm, height_max_cm,
        last_seen_location, last_seen_address, last_seen_at,
        clothing_description, circumstances, alert_radius_km,
        country_extension
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        ST_GeogFromText($12),$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        request.user.id, data.name, data.age, data.gender || 'unknown',
        data.photo_url, JSON.stringify(data.description || {}),
        data.skin_tone, data.hair_color, data.eye_color,
        data.height_min_cm, data.height_max_cm,
        point, data.last_seen_address, data.last_seen_at,
        data.clothing_description, data.circumstances, alert_radius_km,
        JSON.stringify(data.country_extension || {}),
      ]
    );

    const report = result.rows[0];

    // Broadcast to Socket.IO clients in affected region cells
    const alertPayload = {
      id: report.id,
      name: report.name,
      photo_url: report.photo_url,
      latitude,
      longitude,
      alert_radius_km,
      created_at: report.created_at,
    };
    const cells = getGridCellsInRadius(latitude, longitude, alert_radius_km);
    for (const cell of cells) {
      fastify.io.to(`region:${cell}`).emit('new_alert', alertPayload);
    }

    // TODO: Queue FCM push notification job via BullMQ

    reply.code(201);
    return report;
  });

  // --- Get active alerts near location ---
  fastify.get('/missing/nearby', {
    schema: {
      querystring: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radius_km: { type: 'integer', default: 10 },
          limit: { type: 'integer', default: 50 },
        },
      },
    },
  }, async (request) => {
    const { latitude, longitude, radius_km = 10, limit = 50 } = request.query;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    const result = await fastify.db.query(
      `SELECT id, name, age, gender, photo_url, clothing_description,
              last_seen_address, last_seen_at, alert_radius_km,
              ST_Y(last_seen_location::geometry) AS latitude,
              ST_X(last_seen_location::geometry) AS longitude,
              ST_Distance(last_seen_location, ST_GeogFromText($1)) AS distance_m,
              sighting_count, created_at
       FROM missing_reports
       WHERE status = 'active'
         AND ST_DWithin(last_seen_location, ST_GeogFromText($1), $2 * 1000)
       ORDER BY created_at DESC
       LIMIT $3`,
      [point, radius_km, limit]
    );

    return { alerts: result.rows, count: result.rows.length };
  });

  // --- Get single report ---
  fastify.get('/missing/:id', async (request) => {
    const result = await fastify.db.query(
      `SELECT r.*,
              ST_Y(r.last_seen_location::geometry) AS latitude,
              ST_X(r.last_seen_location::geometry) AS longitude,
              u.name AS reporter_name
       FROM missing_reports r
       JOIN users u ON u.id = r.reporter_id
       WHERE r.id = $1`,
      [request.params.id]
    );

    if (result.rows.length === 0) {
      return { error: 'Report not found' };
    }
    return result.rows[0];
  });

  // --- Update report (status and/or additional details for 2-phase flow) ---
  fastify.patch('/missing/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'resolved', 'expired', 'false_alarm'] },
          gender: { type: 'string', enum: ['male', 'female', 'other', 'unknown'] },
          clothing_description: { type: 'string', maxLength: config.maxStringLength },
          last_seen_address: { type: 'string', maxLength: config.maxStringLength },
          circumstances: { type: 'string', maxLength: config.maxStringLength },
          hair_color: { type: 'string', maxLength: 100 },
          eye_color: { type: 'string', maxLength: 100 },
          height_min_cm: { type: 'integer', minimum: 0, maximum: 300 },
          height_max_cm: { type: 'integer', minimum: 0, maximum: 300 },
        },
      },
    },
  }, async (request, reply) => {
    const { status, ...details } = request.body;

    // Build dynamic SET clause for provided fields
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      setClauses.push(`status = $${paramIndex}::report_status`);
      params.push(status);
      paramIndex++;
      if (status === 'resolved') {
        setClauses.push(`resolved_at = NOW()`);
      }
    }

    const allowedFields = [
      'gender', 'clothing_description', 'last_seen_address', 'circumstances',
      'hair_color', 'eye_color', 'height_min_cm', 'height_max_cm',
    ];
    for (const field of allowedFields) {
      if (details[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        params.push(details[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    params.push(request.params.id, request.user.id);
    const result = await fastify.db.query(
      `UPDATE missing_reports
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND reporter_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Report not found or not owned by you' });
    }

    if (status === 'resolved') {
      fastify.io.emit('alert_resolved', { id: request.params.id });
    }

    return result.rows[0];
  });
}
