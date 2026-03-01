export const config = {
  /** HTTP server port */
  PORT: parseInt(process.env.PORT ?? '3011', 10),

  /** Redis connection URL */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Comma-separated list of Kafka broker addresses */
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),

  /** Primary database connection URL */
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/rajutechie-streamkit_users',
} as const;
