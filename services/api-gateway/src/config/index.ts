import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().default('rajutechie-streamkit-dev-secret-change-me'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGINS: z.string().default('*'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Downstream service URLs
  AUTH_SERVICE_URL: z.string().default('http://localhost:3010'),
  USER_SERVICE_URL: z.string().default('http://localhost:3011'),
  CHAT_SERVICE_URL: z.string().default('http://localhost:3012'),
  CALL_SERVICE_URL: z.string().default('http://localhost:3013'),
  MEETING_SERVICE_URL: z.string().default('http://localhost:3014'),
  STREAM_SERVICE_URL: z.string().default('http://localhost:3015'),
  MEDIA_SERVICE_URL: z.string().default('http://localhost:3018'),
  NOTIFICATION_SERVICE_URL: z.string().default('http://localhost:3016'),
  PRESENCE_SERVICE_URL: z.string().default('http://localhost:3017'),
  ANALYTICS_SERVICE_URL: z.string().default('http://localhost:3019'),
  MODERATION_SERVICE_URL: z.string().default('http://localhost:3020'),
  SIGNALING_SERVER_URL: z.string().default('http://localhost:3030'),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid environment configuration:', result.error.format());
      process.exit(1);
    }
    _config = result.data;
  }
  return _config;
}

export const config = getConfig();
