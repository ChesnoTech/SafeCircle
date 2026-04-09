import { config } from '../config/index.js';
import {
  MODERATOR_ROLES,
  FLAG_CONTENT_TYPES,
  FLAG_REASONS,
  FLAG_STATUSES,
  ACTION_TYPES,
  CONTENT_TYPE_MAP,
  requireRole,
} from '../utils/moderation.js';

export async function moderationRoutes(fastify) {
  const moderatorPreHandler = [fastify.authenticate, requireRole(MODERATOR_ROLES)];

  // ------------------------------------------------------------------
  // POST /flags — any authenticated user can flag content
  // ------------------------------------------------------------------
  fastify.post('/flags', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: {
        max: config.moderationFlagRateLimit,
        timeWindow: '1 minute',
      },
    },
    schema: {
      body: {
        type: 'object',
        required: ['content_type', 'content_id', 'reason'],
        properties: {
          content_type: { type: 'string', enum: FLAG_CONTENT_TYPES },
          content_id:   { type: 'string', format: 'uuid' },
          reason:       { type: 'string', enum: FLAG_REASONS },
          details:      { type: 'string', maxLength: config.maxStringLength },
        },
      },
    },
  }, async (request, reply) => {
    const { content_type, content_id, reason, details } = request.body;
    const reporterId = request.user.id;

    // --- Verify the content exists ---
    const mapping = CONTENT_TYPE_MAP[content_type];
    if (!mapping) {
      return reply.code(400).send({ error: 'Invalid content type' });
    }

    const contentResult = await fastify.db.query(
      `SELECT id${mapping.ownerCol ? `, ${mapping.ownerCol} AS owner_id` : ''} FROM ${mapping.table} WHERE id = $1`,
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Content not found' });
    }

    // --- Prevent self-flagging ---
    if (mapping.ownerCol) {
      const ownerId = contentResult.rows[0].owner_id;
      if (ownerId === reporterId) {
        return reply.code(400).send({ error: 'You cannot flag your own content' });
      }
    }

    // --- Prevent duplicate pending flags by the same user on the same content ---
    const duplicateCheck = await fastify.db.query(
      `SELECT id FROM content_flags
       WHERE reporter_id = $1 AND content_type = $2 AND content_id = $3 AND status = 'pending'`,
      [reporterId, content_type, content_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return reply.code(409).send({ error: 'You already have a pending flag on this content' });
    }

    // --- Insert the flag ---
    const result = await fastify.db.query(
      `INSERT INTO content_flags (reporter_id, content_type, content_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, created_at`,
      [reporterId, content_type, content_id, reason, details || null]
    );

    reply.code(201);
    return result.rows[0];
  });

  // ------------------------------------------------------------------
  // GET /flags — moderator+ only, paginated, filterable
  // ------------------------------------------------------------------
  fastify.get('/flags', {
    preHandler: moderatorPreHandler,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status:       { type: 'string', enum: FLAG_STATUSES },
          content_type: { type: 'string', enum: FLAG_CONTENT_TYPES },
          page:         { type: 'integer', minimum: 1, default: 1 },
          limit:        { type: 'integer', minimum: 1, maximum: 100, default: config.moderationPageSize },
        },
      },
    },
  }, async (request) => {
    const { status, content_type, page = 1, limit = config.moderationPageSize } = request.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`cf.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (content_type) {
      conditions.push(`cf.content_type = $${paramIdx}`);
      params.push(content_type);
      paramIdx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count total matching flags for pagination metadata
    const countResult = await fastify.db.query(
      `SELECT COUNT(*) AS total FROM content_flags cf ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch the page
    params.push(limit, offset);
    const result = await fastify.db.query(
      `SELECT cf.*,
              u_reporter.name AS reporter_name,
              u_reviewer.name AS reviewer_name
       FROM content_flags cf
       LEFT JOIN users u_reporter ON u_reporter.id = cf.reporter_id
       LEFT JOIN users u_reviewer ON u_reviewer.id = cf.reviewer_id
       ${whereClause}
       ORDER BY cf.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    return {
      flags: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // ------------------------------------------------------------------
  // PATCH /flags/:id — moderator+ updates status / adds notes
  // ------------------------------------------------------------------
  fastify.patch('/flags/:id', {
    preHandler: moderatorPreHandler,
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
        required: ['status'],
        properties: {
          status:         { type: 'string', enum: ['reviewed', 'actioned', 'dismissed'] },
          reviewer_notes: { type: 'string', maxLength: config.maxStringLength },
        },
      },
    },
  }, async (request, reply) => {
    const flagId = request.params.id;
    const { status, reviewer_notes } = request.body;
    const reviewerId = request.user.id;

    const result = await fastify.db.query(
      `UPDATE content_flags
       SET status = $1,
           reviewer_id = $2,
           reviewer_notes = COALESCE($3, reviewer_notes),
           reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, reviewerId, reviewer_notes || null, flagId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Flag not found' });
    }

    return result.rows[0];
  });

  // ------------------------------------------------------------------
  // POST /flags/:id/action — moderator+ takes action on a flag
  // ------------------------------------------------------------------
  fastify.post('/flags/:id/action', {
    preHandler: moderatorPreHandler,
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
        required: ['action_type'],
        properties: {
          action_type: { type: 'string', enum: ACTION_TYPES },
        },
      },
    },
  }, async (request, reply) => {
    const flagId = request.params.id;
    const { action_type } = request.body;
    const performedBy = request.user.id;

    // --- Fetch the flag ---
    const flagResult = await fastify.db.query(
      `SELECT * FROM content_flags WHERE id = $1`,
      [flagId]
    );

    if (flagResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Flag not found' });
    }

    const flag = flagResult.rows[0];
    const mapping = CONTENT_TYPE_MAP[flag.content_type];

    // --- Execute the action ---
    if (action_type === 'hide' && mapping && mapping.statusCol) {
      await fastify.db.query(
        `UPDATE ${mapping.table} SET ${mapping.statusCol} = 'hidden' WHERE id = $1`,
        [flag.content_id]
      );
    }

    if (action_type === 'remove' && mapping) {
      // Soft-remove: mark content as removed via status if available,
      // otherwise delete the row
      if (mapping.statusCol) {
        await fastify.db.query(
          `UPDATE ${mapping.table} SET ${mapping.statusCol} = 'removed' WHERE id = $1`,
          [flag.content_id]
        );
      } else {
        await fastify.db.query(
          `DELETE FROM ${mapping.table} WHERE id = $1`,
          [flag.content_id]
        );
      }
    }

    if (action_type === 'ban_user' && mapping && mapping.ownerCol) {
      // Find the content owner and set banned_at
      const ownerResult = await fastify.db.query(
        `SELECT ${mapping.ownerCol} AS owner_id FROM ${mapping.table} WHERE id = $1`,
        [flag.content_id]
      );

      if (ownerResult.rows.length > 0 && ownerResult.rows[0].owner_id) {
        await fastify.db.query(
          `UPDATE users SET banned_at = NOW() WHERE id = $1`,
          [ownerResult.rows[0].owner_id]
        );
      }
    }

    // --- Log the action ---
    const actionResult = await fastify.db.query(
      `INSERT INTO content_actions (flag_id, action_type, performed_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [flagId, action_type, performedBy]
    );

    // --- Auto-update the flag to 'actioned' ---
    await fastify.db.query(
      `UPDATE content_flags
       SET status = 'actioned', reviewer_id = $1, reviewed_at = NOW()
       WHERE id = $2 AND status != 'actioned'`,
      [performedBy, flagId]
    );

    reply.code(201);
    return actionResult.rows[0];
  });
}
