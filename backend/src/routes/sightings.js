import { config } from '../config/index.js';

export async function sightingRoutes(fastify) {
  // --- Report a sighting ---
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['report_id', 'latitude', 'longitude'],
        properties: {
          report_id: { type: 'string', format: 'uuid' },
          latitude: { type: 'number', minimum: config.latitudeRange.min, maximum: config.latitudeRange.max },
          longitude: { type: 'number', minimum: config.longitudeRange.min, maximum: config.longitudeRange.max },
          confidence: { type: 'string', enum: ['certain', 'likely', 'unsure'] },
          direction_of_travel: { type: 'string', maxLength: config.maxStringLength },
          photo_url: { type: 'string', maxLength: config.maxStringLength },
          notes: { type: 'string', maxLength: config.maxStringLength },
          accompanied: { type: 'string', maxLength: config.maxStringLength },
        },
      },
    },
  }, async (request, reply) => {
    const { report_id, latitude, longitude, ...data } = request.body;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    const result = await fastify.db.query(
      `INSERT INTO sightings (report_id, spotter_id, location, confidence,
        direction_of_travel, photo_url, notes, accompanied)
       VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        report_id, request.user.id, point,
        data.confidence || 'unsure', data.direction_of_travel || 'unknown',
        data.photo_url, data.notes, data.accompanied,
      ]
    );

    const sighting = result.rows[0];

    // Broadcast sighting to clients watching this report
    fastify.io.to(`report:${report_id}`).emit('new_sighting', {
      ...sighting,
      latitude,
      longitude,
    });

    reply.code(201);
    return sighting;
  });

  // --- Get sightings for a report ---
  fastify.get('/:reportId', async (request) => {
    const result = await fastify.db.query(
      `SELECT s.*,
              ST_Y(s.location::geometry) AS latitude,
              ST_X(s.location::geometry) AS longitude
       FROM sightings s
       WHERE s.report_id = $1
       ORDER BY s.created_at DESC`,
      [request.params.reportId]
    );

    return { sightings: result.rows, count: result.rows.length };
  });

  // --- Add photos to a sighting ---
  fastify.post('/:sightingId/photos', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['sightingId'],
        properties: { sightingId: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['photo_urls'],
        properties: {
          photo_urls: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: config.maxPhotosPerReport,
          },
        },
      },
    },
  }, async (request, reply) => {
    const sightingId = request.params.sightingId;
    const { photo_urls } = request.body;

    // Verify sighting belongs to user
    const sighting = await fastify.db.query(
      'SELECT id FROM sightings WHERE id = $1 AND spotter_id = $2',
      [sightingId, request.user.id]
    );
    if (sighting.rows.length === 0) {
      return reply.code(404).send({ error: 'Sighting not found or not yours' });
    }

    const existing = await fastify.db.query(
      'SELECT COUNT(*)::int AS count FROM report_photos WHERE report_type = $1 AND report_id = $2',
      ['sighting', sightingId]
    );
    const currentCount = existing.rows[0].count;
    if (currentCount + photo_urls.length > config.maxPhotosPerReport) {
      return reply.code(400).send({ error: `Maximum ${config.maxPhotosPerReport} photos per sighting` });
    }

    const photos = [];
    for (let i = 0; i < photo_urls.length; i++) {
      const result = await fastify.db.query(
        `INSERT INTO report_photos (report_type, report_id, photo_url, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        ['sighting', sightingId, photo_urls[i], currentCount + i]
      );
      photos.push(result.rows[0]);
    }

    reply.code(201);
    return { photos };
  });

  // --- Get photos for a sighting ---
  fastify.get('/:sightingId/photos', {
    schema: {
      params: {
        type: 'object',
        required: ['sightingId'],
        properties: { sightingId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request) => {
    const result = await fastify.db.query(
      `SELECT id, photo_url, sort_order, created_at
       FROM report_photos
       WHERE report_type = $1 AND report_id = $2
       ORDER BY sort_order ASC`,
      ['sighting', request.params.sightingId]
    );
    return { photos: result.rows };
  });
}
