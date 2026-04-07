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
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          confidence: { type: 'string', enum: ['certain', 'likely', 'unsure'] },
          direction_of_travel: { type: 'string' },
          photo_url: { type: 'string' },
          notes: { type: 'string' },
          accompanied: { type: 'string' },
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
}
