import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { dbPlugin } from './plugins/db.js';
import { authPlugin } from './plugins/auth.js';
import { redisPlugin } from './plugins/redis.js';
import { storagePlugin } from './plugins/storage.js';
import { authRoutes } from './routes/auth.js';
import { reportRoutes } from './routes/reports.js';
import { sightingRoutes } from './routes/sightings.js';
import { lostFoundRoutes } from './routes/lostfound.js';
import { intelRoutes } from './routes/intel.js';
import { uploadRoutes } from './routes/upload.js';
import { userRoutes } from './routes/users.js';
import { notificationRoutes } from './routes/notifications.js';
import { verificationRoutes } from './routes/verification.js';
import { resolutionRoutes } from './routes/resolution.js';

const app = Fastify({
  logger: {
    transport: config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// --- Plugins ---
await app.register(cors, { origin: true });
await app.register(rateLimit, { max: config.globalRateLimit, timeWindow: '1 minute' });
await app.register(multipart, { limits: { fileSize: config.maxFileSizeMB * 1024 * 1024 } });
await app.register(dbPlugin);
await app.register(redisPlugin);
await app.register(authPlugin);
await app.register(storagePlugin);

// --- Routes ---
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(reportRoutes, { prefix: '/api/reports' });
await app.register(sightingRoutes, { prefix: '/api/sightings' });
await app.register(lostFoundRoutes, { prefix: '/api/items' });
await app.register(intelRoutes, { prefix: '/api/intel' });
await app.register(uploadRoutes, { prefix: '/api/upload' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(notificationRoutes, { prefix: '/api/notifications' });
await app.register(verificationRoutes, { prefix: '/api/verification' });
await app.register(resolutionRoutes, { prefix: '/api' });

// --- Health Check ---
app.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
}));

// --- Socket.IO ---
const io = new Server(app.server, {
  cors: { origin: '*' },
  path: '/socket.io',
});

io.on('connection', (socket) => {
  app.log.info(`Socket connected: ${socket.id}`);

  socket.on('join_region', (gridCell) => {
    socket.join(`region:${gridCell}`);
  });

  socket.on('leave_region', (gridCell) => {
    socket.leave(`region:${gridCell}`);
  });

  socket.on('watch_report', (reportId) => {
    socket.join(`report:${reportId}`);
  });

  socket.on('unwatch_report', (reportId) => {
    socket.leave(`report:${reportId}`);
  });

  socket.on('disconnect', () => {
    app.log.info(`Socket disconnected: ${socket.id}`);
  });
});

app.decorate('io', io);

// --- Start ---
try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`SafeCircle API running on port ${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
