import { config } from '../config/index.js';

/** Map report types to their database tables and owner columns. */
const REPORT_TYPE_MAP = {
  missing: { table: 'missing_reports', ownerCol: 'reporter_id', statusCol: 'status', locationCol: 'last_seen_location' },
  lost: { table: 'lost_items', ownerCol: 'reporter_id', statusCol: 'status', locationCol: 'lost_location' },
  found: { table: 'found_items', ownerCol: 'finder_id', statusCol: 'status', locationCol: 'found_location' },
};

const VALID_REPORT_TYPES = Object.keys(REPORT_TYPE_MAP);
const VALID_RESOLUTION_TYPES = ['found_safe', 'returned', 'false_alarm', 'other'];

export async function resolutionRoutes(fastify) {
  // --- Mark report as resolved ---
  fastify.post('/reports/:id/resolve', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['resolution_type', 'report_type'],
        properties: {
          report_type: { type: 'string', enum: VALID_REPORT_TYPES },
          resolution_type: { type: 'string', enum: VALID_RESOLUTION_TYPES },
          story: { type: 'string', maxLength: config.storyMaxLength },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
        },
      },
    },
  }, async (request, reply) => {
    const { id: reportId } = request.params;
    const { report_type: reportType, resolution_type: resolutionType, story, rating } = request.body;
    const userId = request.user.id;

    const mapping = REPORT_TYPE_MAP[reportType];
    if (!mapping) {
      return reply.code(400).send({ error: 'Invalid report type' });
    }

    // Verify ownership
    const reportResult = await fastify.db.query(
      `SELECT id, ${mapping.ownerCol} AS owner_id, ${mapping.statusCol} AS status,
              ST_Y(${mapping.locationCol}::geometry) AS latitude,
              ST_X(${mapping.locationCol}::geometry) AS longitude
       FROM ${mapping.table} WHERE id = $1`,
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    if (report.owner_id !== userId) {
      return reply.code(403).send({ error: 'Only the report owner can resolve it' });
    }

    // Check report is not already resolved
    const resolvedStatuses = ['resolved', 'returned'];
    if (resolvedStatuses.includes(report.status)) {
      return reply.code(400).send({ error: 'Report is already resolved' });
    }

    // Determine the resolved status value based on table type
    const resolvedStatus = reportType === 'missing' ? 'resolved' : 'returned';

    // Update report status
    if (reportType === 'missing') {
      await fastify.db.query(
        `UPDATE ${mapping.table} SET status = $1::report_status, resolved_at = NOW() WHERE id = $2`,
        [resolvedStatus, reportId]
      );
    } else {
      await fastify.db.query(
        `UPDATE ${mapping.table} SET status = $1::item_status WHERE id = $2`,
        [resolvedStatus, reportId]
      );
    }

    // Derive city from coordinates (use reverse-geocoded city if available, otherwise approximate)
    let city = null;
    if (report.latitude && report.longitude) {
      // Store approximate location as city-level string (lat/lon rounded for privacy)
      const latRounded = Math.round(report.latitude * 10) / 10;
      const lonRounded = Math.round(report.longitude * 10) / 10;
      city = `${latRounded},${lonRounded}`;
    }

    let storyRecord = null;

    // Create resolution story if story text provided or for shareable resolutions
    if (story || resolutionType === 'found_safe' || resolutionType === 'returned') {
      const storyResult = await fastify.db.query(
        `INSERT INTO resolution_stories (report_type, report_id, resolver_id, resolution_type, story, rating, city)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, report_type, resolution_type, story, city, celebration_count, created_at`,
        [reportType, reportId, userId, resolutionType, story || null, rating || null, city]
      );
      storyRecord = storyResult.rows[0];
    }

    // Broadcast resolution via Socket.IO
    fastify.io.emit('report_resolved', {
      reportId,
      reportType,
      resolutionType,
    });

    return {
      resolved: true,
      reportId,
      resolutionType,
      story: storyRecord || null,
    };
  });

  // --- Public feed of reunited stories (anonymized) ---
  fastify.get('/stories', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: config.storiesPageSize },
          resolution_type: { type: 'string', enum: VALID_RESOLUTION_TYPES },
          report_type: { type: 'string', enum: VALID_REPORT_TYPES },
        },
      },
    },
  }, async (request) => {
    const {
      page = 1,
      limit = config.storiesPageSize,
      resolution_type: resolutionType,
      report_type: reportType,
    } = request.query;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (resolutionType) {
      params.push(resolutionType);
      conditions.push(`s.resolution_type = $${params.length}`);
    }

    if (reportType) {
      params.push(reportType);
      conditions.push(`s.report_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await fastify.db.query(
      `SELECT COUNT(*) AS total FROM resolution_stories s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch page (anonymized: no user names or exact locations)
    const storiesResult = await fastify.db.query(
      `SELECT s.id, s.resolution_type, s.report_type, s.story, s.city,
              s.celebration_count, s.created_at
       FROM resolution_stories s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      stories: storiesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // --- Single story detail ---
  fastify.get('/stories/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const result = await fastify.db.query(
      `SELECT s.id, s.resolution_type, s.report_type, s.story, s.city,
              s.celebration_count, s.created_at
       FROM resolution_stories s
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    return result.rows[0];
  });

  // --- Celebrate (like) a story ---
  fastify.post('/stories/:id/celebrate', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const result = await fastify.db.query(
      `UPDATE resolution_stories
       SET celebration_count = celebration_count + 1
       WHERE id = $1
       RETURNING id, celebration_count`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    return result.rows[0];
  });
}
