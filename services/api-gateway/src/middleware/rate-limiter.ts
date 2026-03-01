import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config/index.js';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on('error', (err) => {
      console.error('[rate-limiter] Redis error:', err.message);
    });
  }
  return redis;
}

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

/**
 * Redis-based sliding window rate limiter.
 *
 * Key pattern: ratelimit:{keyPrefix}:{identifier}:{endpoint}
 *
 * Uses a sorted set with timestamps as scores. Entries older than the window
 * are removed on each request, and the remaining count determines whether
 * the request is allowed.
 */
export function rateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? config.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? config.RATE_LIMIT_MAX_REQUESTS;
  const keyPrefix = options.keyPrefix ?? 'ratelimit';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const client = getRedis();

    // Determine identifier: authenticated user, API key, or IP
    const identifier =
      req.user?.userId ??
      (req.headers['x-api-key'] as string) ??
      req.ip ??
      'unknown';

    const endpoint = req.baseUrl + req.path;
    const key = `${keyPrefix}:${identifier}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = client.pipeline();
      // Remove entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Count remaining entries
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`);
      // Set TTL so keys auto-expire
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();

      // zcard result is at index 1, value is at position [1] of that tuple
      const currentCount = (results?.[1]?.[1] as number) ?? 0;

      // Set rate limit headers
      const remaining = Math.max(0, maxRequests - currentCount - 1);
      const resetTime = Math.ceil((now + windowMs) / 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
        return;
      }

      next();
    } catch (err) {
      // If Redis is unavailable, fail open (allow the request) and log
      console.error('[rate-limiter] Redis error, failing open:', (err as Error).message);
      next();
    }
  };
}

export async function closeRateLimiterRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
