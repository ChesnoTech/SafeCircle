export async function userRoutes(fastify) {
  // --- Get current user profile ---
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const result = await fastify.db.query(
      `SELECT id, email, name, phone, photo_url, language, country,
              notification_radius_km, notification_categories,
              credibility_score, role, email_verified,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude,
              created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [request.user.id]
    );

    if (result.rows.length === 0) {
      return { error: 'User not found' };
    }
    return result.rows[0];
  });

  // --- Update profile ---
  fastify.patch('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const allowed = ['name', 'phone', 'photo_url', 'language'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (request.body[key] !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(request.body[key]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'No valid fields to update' });
    }

    values.push(request.user.id);
    const result = await fastify.db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email`,
      values
    );

    return result.rows[0];
  });

  // --- Update location ---
  fastify.put('/me/location', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
      },
    },
  }, async (request) => {
    const { latitude, longitude } = request.body;
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    await fastify.db.query(
      'UPDATE users SET location = ST_GeogFromText($1), last_active_at = NOW() WHERE id = $2',
      [point, request.user.id]
    );

    return { updated: true };
  });

  // --- Update notification settings ---
  fastify.put('/me/settings', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          notification_radius_km: { type: 'integer', minimum: 1, maximum: 100 },
          notification_categories: { type: 'array', items: { type: 'string' } },
          quiet_hours_start: { type: 'string' },
          quiet_hours_end: { type: 'string' },
          fcm_token: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { notification_radius_km, notification_categories, quiet_hours_start, quiet_hours_end, fcm_token } = request.body;

    await fastify.db.query(
      `UPDATE users SET
        notification_radius_km = COALESCE($1, notification_radius_km),
        notification_categories = COALESCE($2, notification_categories),
        quiet_hours_start = COALESCE($3, quiet_hours_start),
        quiet_hours_end = COALESCE($4, quiet_hours_end),
        fcm_token = COALESCE($5, fcm_token)
       WHERE id = $6`,
      [notification_radius_km, notification_categories, quiet_hours_start, quiet_hours_end, fcm_token, request.user.id]
    );

    return { updated: true };
  });

  // --- Get user's own reports ---
  fastify.get('/me/reports', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const [missing, lost, found] = await Promise.all([
      fastify.db.query(
        'SELECT id, name, status, created_at FROM missing_reports WHERE reporter_id = $1 ORDER BY created_at DESC',
        [request.user.id]
      ),
      fastify.db.query(
        'SELECT id, category, description, status, created_at FROM lost_items WHERE reporter_id = $1 ORDER BY created_at DESC',
        [request.user.id]
      ),
      fastify.db.query(
        'SELECT id, category, description, status, created_at FROM found_items WHERE finder_id = $1 ORDER BY created_at DESC',
        [request.user.id]
      ),
    ]);

    return {
      missing: missing.rows,
      lost: lost.rows,
      found: found.rows,
    };
  });
}
