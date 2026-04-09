import fp from 'fastify-plugin';
import { Queue } from 'bullmq';

const QUEUE_NAME = 'alert';

async function queue(fastify) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(redisUrl);

  const connection = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    maxRetriesPerRequest: null, // Required by BullMQ
  };

  if (parsed.password) {
    connection.password = parsed.password;
  }
  if (parsed.username) {
    connection.username = parsed.username;
  }

  const alertQueue = new Queue(QUEUE_NAME, { connection });

  fastify.decorate('alertQueue', alertQueue);

  fastify.addHook('onClose', async () => {
    await alertQueue.close();
  });

  fastify.log.info('BullMQ alert queue registered');
}

export const queuePlugin = fp(queue, { name: 'queue' });
