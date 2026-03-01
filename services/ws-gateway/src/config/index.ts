import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().default('rajutechie-streamkit-dev-secret-change-me'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  WS_MAX_CONNECTIONS: z.coerce.number().default(10_000),
  WS_HEARTBEAT_INTERVAL: z.coerce.number().default(25_000),
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
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

/**
 * Parse KAFKA_BROKERS from a comma-separated string into an array.
 */
export function getKafkaBrokers(config: Config): string[] {
  return config.KAFKA_BROKERS.split(',').map((b) => b.trim());
}

/**
 * Parse CORS_ORIGINS into an array or wildcard.
 */
export function getCorsOrigins(config: Config): string | string[] {
  if (config.CORS_ORIGINS === '*') return '*';
  return config.CORS_ORIGINS.split(',').map((o) => o.trim());
}

export const config = getConfig();
