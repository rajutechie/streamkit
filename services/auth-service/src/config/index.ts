export const config = {
  /** HTTP server port */
  PORT: parseInt(process.env.PORT ?? '3010', 10),

  /** Secret used to sign and verify JWTs */
  JWT_SECRET: process.env.JWT_SECRET ?? 'rajutechie-streamkit-dev-secret-change-in-production',

  /** Access token lifetime in seconds (default: 1 hour) */
  JWT_EXPIRATION: parseInt(process.env.JWT_EXPIRATION ?? '3600', 10),

  /** Refresh token lifetime in seconds (default: 7 days) */
  JWT_REFRESH_EXPIRATION: parseInt(process.env.JWT_REFRESH_EXPIRATION ?? '604800', 10),

  /** Redis connection URL */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Primary database connection URL */
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/rajutechie-streamkit_auth',
} as const;
