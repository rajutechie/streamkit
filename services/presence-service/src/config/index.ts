export const config = {
  /** HTTP server port */
  PORT: parseInt(process.env.PORT ?? '3017', 10),

  /** Redis connection URL */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Presence TTL in seconds – entries older than this are considered stale */
  PRESENCE_TTL_SECONDS: parseInt(process.env.PRESENCE_TTL_SECONDS ?? '300', 10),
} as const;
