import fp from 'fastify-plugin';
import pg from 'pg';

async function db(fastify) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  fastify.log.info('PostgreSQL connected');

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
}

export const dbPlugin = fp(db, { name: 'db' });
