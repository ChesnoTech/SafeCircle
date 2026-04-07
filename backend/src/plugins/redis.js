import fp from 'fastify-plugin';
import Redis from 'ioredis';

async function redis(fastify) {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  });

  client.on('connect', () => fastify.log.info('Redis connected'));
  client.on('error', (err) => fastify.log.error('Redis error:', err));

  fastify.decorate('redis', client);

  fastify.addHook('onClose', async () => {
    await client.quit();
  });
}

export const redisPlugin = fp(redis, { name: 'redis' });
