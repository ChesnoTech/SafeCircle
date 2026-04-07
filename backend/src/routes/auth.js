import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';

export async function authRoutes(fastify) {
  // --- Register ---
  fastify.post('/register', {
    config: { rateLimit: { max: config.authRateLimit, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: config.maxStringLength },
          password: { type: 'string', minLength: config.minPasswordLength },
          name: { type: 'string', minLength: 1, maxLength: config.maxStringLength },
          phone: { type: 'string', maxLength: config.maxStringLength },
          language: { type: 'string', default: 'en' },
          country: { type: 'string', default: 'RU' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, name, phone, language, country } = request.body;

    // Check if user exists
    const existing = await fastify.db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    if (existing.rows.length > 0) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await fastify.db.query(
      `INSERT INTO users (email, password_hash, name, phone, language, country)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role`,
      [email, passwordHash, name, phone, language, country]
    );

    const user = result.rows[0];
    const token = fastify.jwt.sign({ id: user.id, role: user.role });
    const refreshToken = randomUUID();

    await fastify.db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    return { user, token, refreshToken };
  });

  // --- Login ---
  fastify.post('/login', {
    config: { rateLimit: { max: config.authRateLimit, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: config.maxStringLength },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const result = await fastify.db.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Update last active
    await fastify.db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    const token = fastify.jwt.sign({ id: user.id, role: user.role });
    const refreshToken = randomUUID();

    await fastify.db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token, refreshToken };
  });

  // --- Refresh Token ---
  fastify.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body;

    const result = await fastify.db.query(
      `DELETE FROM refresh_tokens
       WHERE token = $1 AND expires_at > NOW()
       RETURNING user_id`,
      [refreshToken]
    );
    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }

    const userId = result.rows[0].user_id;
    const user = await fastify.db.query(
      'SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (user.rows.length === 0) {
      return reply.code(401).send({ error: 'User not found' });
    }

    const token = fastify.jwt.sign({ id: userId, role: user.rows[0].role });
    const newRefreshToken = randomUUID();

    await fastify.db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [userId, newRefreshToken]
    );

    return { token, refreshToken: newRefreshToken };
  });
}
