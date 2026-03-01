export const config = {
  /** HTTP server port */
  PORT: parseInt(process.env.PORT ?? '3018', 10),

  /** S3-compatible endpoint URL */
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',

  /** S3 access key */
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'minioadmin',

  /** S3 secret key */
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'minioadmin',

  /** S3 bucket for media uploads */
  S3_BUCKET_MEDIA: process.env.S3_BUCKET_MEDIA ?? 'rajutechie-streamkit-media',

  /** S3 region */
  S3_REGION: process.env.S3_REGION ?? 'us-east-1',

  /** Force path-style addressing (required for MinIO / local S3) */
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE !== 'false',

  /** Redis connection URL */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Primary database connection URL */
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/rajutechie-streamkit_media',
} as const;
