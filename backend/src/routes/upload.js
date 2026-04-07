import { randomUUID } from 'crypto';
import sharp from 'sharp';

export async function uploadRoutes(fastify) {
  // --- Upload photo ---
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.code(400).send({ error: 'Only JPEG, PNG, WebP, HEIC images allowed' });
    }

    // Read file buffer
    const chunks = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Process with Sharp: convert to WebP, strip EXIF (privacy!), resize
    const processed = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .rotate()
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 60 })
      .toBuffer();

    const filename = `${randomUUID()}.webp`;
    const thumbFilename = `${randomUUID()}_thumb.webp`;

    const url = await fastify.uploadFile(processed, filename, 'image/webp');
    const thumbnailUrl = await fastify.uploadFile(thumbnail, thumbFilename, 'image/webp');

    return {
      url,
      thumbnail_url: thumbnailUrl,
      size: processed.length,
      mime_type: 'image/webp',
    };
  });
}
