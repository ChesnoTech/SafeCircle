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

    // Generate email verification code and store in DB
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    await fastify.db.query(
      `INSERT INTO email_verifications (user_id, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${config.emailVerificationExpiryMinutes} minutes')`,
      [user.id, verificationCode]
    );
    fastify.log.info({ verificationCode, email }, 'Email verification code');

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
      'SELECT id, email, name, password_hash, role, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL',
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

  // --- Verify Email ---
  fastify.post('/verify-email', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', minLength: config.emailVerificationCodeLength, maxLength: config.emailVerificationCodeLength },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.id;
    const { code } = request.body;

    // Find a valid (non-expired) verification code for this user
    const result = await fastify.db.query(
      `DELETE FROM email_verifications
       WHERE user_id = $1 AND code = $2 AND expires_at > NOW()
       RETURNING id`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      // Check if code existed but expired
      const expired = await fastify.db.query(
        'SELECT id FROM email_verifications WHERE user_id = $1 AND code = $2',
        [userId, code]
      );
      if (expired.rows.length > 0) {
        await fastify.db.query('DELETE FROM email_verifications WHERE user_id = $1 AND code = $2', [userId, code]);
        return reply.code(410).send({ error: 'Code expired' });
      }
      return reply.code(400).send({ error: 'Invalid code' });
    }

    // Mark email as verified
    await fastify.db.query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [userId]
    );

    // Clean up any remaining codes for this user
    await fastify.db.query(
      'DELETE FROM email_verifications WHERE user_id = $1',
      [userId]
    );

    return { verified: true };
  });

  // --- Resend Verification Code ---
  fastify.post('/resend-code', {
    onRequest: [fastify.authenticate],
    config: { rateLimit: { max: config.authRateLimit, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const userId = request.user.id;

    // Check if already verified
    const user = await fastify.db.query(
      'SELECT email, email_verified FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (user.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    if (user.rows[0].email_verified) {
      return reply.code(400).send({ error: 'Email already verified' });
    }

    // Invalidate old codes
    await fastify.db.query(
      'DELETE FROM email_verifications WHERE user_id = $1',
      [userId]
    );

    // Generate and store new code
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    await fastify.db.query(
      `INSERT INTO email_verifications (user_id, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${config.emailVerificationExpiryMinutes} minutes')`,
      [userId, verificationCode]
    );

    const email = user.rows[0].email;
    fastify.log.info({ verificationCode, email }, 'Email verification code');

    return { sent: true };
  });
}
