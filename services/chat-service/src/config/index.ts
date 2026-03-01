import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3012),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/rajutechie-streamkit_chat'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/rajutechie-streamkit_chat'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  PORT: parsed.data.PORT,
  REDIS_URL: parsed.data.REDIS_URL,
  KAFKA_BROKERS: parsed.data.KAFKA_BROKERS.split(','),
  MONGODB_URI: parsed.data.MONGODB_URI,
  DATABASE_URL: parsed.data.DATABASE_URL,
} as const;
