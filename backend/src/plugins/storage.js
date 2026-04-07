import fp from 'fastify-plugin';
import * as Minio from 'minio';

async function storage(fastify) {
  const client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });

  const bucket = process.env.MINIO_BUCKET || 'safecircle';

  // Create bucket if not exists
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
    // Set public read policy for photos
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/public/*`],
      }],
    };
    await client.setBucketPolicy(bucket, JSON.stringify(policy));
    fastify.log.info(`Created MinIO bucket: ${bucket}`);
  }

  fastify.decorate('storage', client);
  fastify.decorate('storageBucket', bucket);

  // Helper: upload file and return URL
  fastify.decorate('uploadFile', async function (buffer, filename, contentType) {
    const path = `public/${filename}`;
    await client.putObject(bucket, path, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return `/storage/${bucket}/${path}`;
  });

  // Helper: get signed URL for private files
  fastify.decorate('getSignedUrl', async function (filename, expiry = 3600) {
    return client.presignedGetObject(bucket, filename, expiry);
  });
}

export const storagePlugin = fp(storage, { name: 'storage' });
