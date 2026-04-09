import { config } from '../config/index.js';

/** Map report types to their database tables and participant columns. */
const REPORT_TYPE_MAP = {
  missing: { table: 'missing_reports', ownerCol: 'reporter_id' },
  lost: { table: 'lost_items', ownerCol: 'reporter_id' },
  found: { table: 'found_items', ownerCol: 'finder_id' },
};

const VALID_REPORT_TYPES = Object.keys(REPORT_TYPE_MAP);

export async function messagingRoutes(fastify) {
  // --- Start or resume a conversation about a report ---
  fastify.post('/conversations', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['report_type', 'report_id', 'recipient_id'],
        properties: {
          report_type: { type: 'string', enum: VALID_REPORT_TYPES },
          report_id: { type: 'string', format: 'uuid' },
          recipient_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { report_type: reportType, report_id: reportId, recipient_id: recipientId } = request.body;
    const userId = request.user.id;

    // Cannot message yourself
    if (userId === recipientId) {
      return reply.code(400).send({ error: 'Cannot start a conversation with yourself' });
    }

    const mapping = REPORT_TYPE_MAP[reportType];
    if (!mapping) {
      return reply.code(400).send({ error: 'Invalid report type' });
    }

    // Verify report exists and recipient is involved
    const reportResult = await fastify.db.query(
      `SELECT id, ${mapping.ownerCol} AS owner_id FROM ${mapping.table} WHERE id = $1`,
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    // At least one of the two users must be the report owner
    if (report.owner_id !== userId && report.owner_id !== recipientId) {
      return reply.code(403).send({ error: 'Recipient is not associated with this report' });
    }

    // Check for existing conversation (normalize participant order using LEAST/GREATEST)
    const existing = await fastify.db.query(
      `SELECT id, status, created_at, updated_at
       FROM conversations
       WHERE report_type = $1 AND report_id = $2
         AND LEAST(participant_a, participant_b) = LEAST($3::uuid, $4::uuid)
         AND GREATEST(participant_a, participant_b) = GREATEST($3::uuid, $4::uuid)`,
      [reportType, reportId, userId, recipientId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new conversation
    const result = await fastify.db.query(
      `INSERT INTO conversations (report_type, report_id, participant_a, participant_b)
       VALUES ($1, $2, $3, $4)
       RETURNING id, report_type, report_id, participant_a, participant_b, status, created_at, updated_at`,
      [reportType, reportId, userId, recipientId]
    );

    const conversation = result.rows[0];

    // Notify recipient via Socket.IO
    fastify.io.to(`user:${recipientId}`).emit('new_conversation', {
      conversationId: conversation.id,
      reportType,
      reportId,
      fromUserId: userId,
    });

    reply.code(201);
    return conversation;
  });

  // --- List my conversations (paginated) ---
  fastify.get('/conversations', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: config.messagingPageSize },
        },
      },
    },
  }, async (request) => {
    const userId = request.user.id;
    const { page = 1, limit = config.messagingPageSize } = request.query;
    const offset = (page - 1) * limit;

    // Count total
    const countResult = await fastify.db.query(
      `SELECT COUNT(*) AS total FROM conversations
       WHERE (participant_a = $1 OR participant_b = $1) AND status != 'blocked'`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch conversations with last message preview and unread count
    // Join with users to get the OTHER participant's name (never email)
    const conversationsResult = await fastify.db.query(
      `SELECT
         c.id,
         c.report_type,
         c.report_id,
         c.status,
         c.created_at,
         c.updated_at,
         CASE
           WHEN c.participant_a = $1 THEN c.participant_b
           ELSE c.participant_a
         END AS other_user_id,
         u.full_name AS other_user_name,
         lm.body AS last_message,
         lm.created_at AS last_message_at,
         COALESCE(unread.count, 0)::int AS unread_count
       FROM conversations c
       JOIN users u ON u.id = CASE
         WHEN c.participant_a = $1 THEN c.participant_b
         ELSE c.participant_a
       END
       LEFT JOIN LATERAL (
         SELECT body, created_at FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC LIMIT 1
       ) lm ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS count FROM messages
         WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL
       ) unread ON true
       WHERE (c.participant_a = $1 OR c.participant_b = $1) AND c.status != 'blocked'
       ORDER BY c.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      conversations: conversationsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // --- Get messages in a conversation (paginated, oldest first) ---
  fastify.get('/conversations/:id/messages', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: config.messagingPageSize },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.id;
    const { id: conversationId } = request.params;
    const { page = 1, limit = config.messagingPageSize } = request.query;
    const offset = (page - 1) * limit;

    // Verify participation
    const convResult = await fastify.db.query(
      `SELECT id FROM conversations
       WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)`,
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    // Count total messages
    const countResult = await fastify.db.query(
      `SELECT COUNT(*) AS total FROM messages WHERE conversation_id = $1`,
      [conversationId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch messages (oldest first)
    const messagesResult = await fastify.db.query(
      `SELECT m.id, m.sender_id, m.body, m.read_at, m.created_at,
              u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    // Mark unread messages from other user as read
    await fastify.db.query(
      `UPDATE messages SET read_at = NOW()
       WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [conversationId, userId]
    );

    return {
      messages: messagesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // --- Send a message ---
  fastify.post('/conversations/:id/messages', {
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
        required: ['body'],
        properties: {
          body: { type: 'string', minLength: 1, maxLength: config.messageMaxLength },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.id;
    const { id: conversationId } = request.params;
    const { body } = request.body;

    // Verify participation and get conversation details
    const convResult = await fastify.db.query(
      `SELECT id, participant_a, participant_b, status
       FROM conversations
       WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)`,
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    const conversation = convResult.rows[0];

    if (conversation.status !== 'active') {
      return reply.code(400).send({ error: 'Conversation is not active' });
    }

    // Determine the other participant
    const recipientId = conversation.participant_a === userId
      ? conversation.participant_b
      : conversation.participant_a;

    // Insert message
    const msgResult = await fastify.db.query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, body, read_at, created_at`,
      [conversationId, userId, body]
    );

    // Get sender name for the socket event (never email)
    const senderResult = await fastify.db.query(
      `SELECT full_name FROM users WHERE id = $1`,
      [userId]
    );

    const message = msgResult.rows[0];
    message.sender_name = senderResult.rows[0]?.full_name || null;

    // Update conversation timestamp
    await fastify.db.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    // Notify recipient via Socket.IO
    fastify.io.to(`user:${recipientId}`).emit('new_message', {
      conversationId,
      message,
    });

    reply.code(201);
    return message;
  });
}
