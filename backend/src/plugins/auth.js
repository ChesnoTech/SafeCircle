import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';

async function auth(fastify) {
  await fastify.register(fjwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  });

  // Decorator to require authentication
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Decorator to require specific role
  fastify.decorate('requireRole', function (...roles) {
    return async function (request, reply) {
      await fastify.authenticate(request, reply);
      if (!roles.includes(request.user.role)) {
        reply.code(403).send({ error: 'Forbidden' });
      }
    };
  });
}

export const authPlugin = fp(auth, { name: 'auth' });
