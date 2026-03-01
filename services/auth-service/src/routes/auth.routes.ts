import { Router, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { config } from '../config/index.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import type Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const tokenRequestSchema = z.object({
  apiKey: z.string().min(1, 'apiKey is required'),
  apiSecret: z.string().min(1, 'apiSecret is required'),
  userId: z.string().min(1, 'userId is required'),
  role: z.string().optional(),
  grants: z
    .record(z.union([z.boolean(), z.string(), z.number()]))
    .optional(),
});

const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const revokeRequestSchema = z.object({
  token: z.string().min(1, 'token is required'),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKeyEntry {
  secret: string;
  name: string;
  isActive: boolean;
}

interface TokenPayload extends JwtPayload {
  sub: string;
  iss: string;
  jti: string;
  role?: string;
  grants?: Record<string, boolean | string | number>;
  type: 'access' | 'refresh';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up an API key record from the database. Seed dev key on first use. */
async function getApiKeyEntry(key: string): Promise<ApiKeyEntry | null> {
  let record = await prisma.apiKey.findUnique({ where: { key } });

  // Auto-seed the default dev key if it doesn't exist yet.
  if (!record && key === 'sk_dev_rajutechie-streamkit_001') {
    record = await prisma.apiKey.upsert({
      where: { key: 'sk_dev_rajutechie-streamkit_001' },
      create: {
        key: 'sk_dev_rajutechie-streamkit_001',
        secret: 'dev_secret_001_change_me_in_production',
        name: 'Default Development Key',
        appId: 'default',
        isActive: true,
      },
      update: {},
    });
  }

  if (!record) return null;
  return { secret: record.secret, name: record.name, isActive: record.isActive };
}

function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRATION },
  );
}

function signRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRATION },
  );
}

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

/**
 * Compute the remaining TTL of a token (in seconds) from its `exp` claim.
 * Returns 0 if the token is already expired.
 */
function remainingTtl(decoded: TokenPayload): number {
  if (!decoded.exp) return 0;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(decoded.exp - now, 0);
}

// ---------------------------------------------------------------------------
// Router factory – accepts a Redis client so it can manage the blacklist
// ---------------------------------------------------------------------------

export function createAuthRouter(redis: Redis): Router {
  const router = Router();

  // -----------------------------------------------------------------------
  // POST /auth/token – Issue a new access + refresh token pair
  // -----------------------------------------------------------------------
  router.post(
    '/token',
    validate(tokenRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { apiKey, apiSecret, userId, role, grants } = req.body;

        const entry = await getApiKeyEntry(apiKey);
        if (!entry) {
          res.status(401).json({ error: 'Invalid API key' });
          return;
        }
        if (!entry.isActive) {
          res.status(403).json({ error: 'API key is deactivated' });
          return;
        }
        if (entry.secret !== apiSecret) {
          res.status(401).json({ error: 'Invalid API secret' });
          return;
        }

        // Record last-used timestamp (fire-and-forget).
        prisma.apiKey.update({ where: { key: apiKey }, data: { lastUsedAt: new Date() } }).catch(() => {});

        const jti = uuidv4();
        const refreshJti = uuidv4();

        const tokenPayload = {
          sub: userId,
          iss: apiKey,
          jti,
          ...(role && { role }),
          ...(grants && { grants }),
        };

        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken({ ...tokenPayload, jti: refreshJti });

        res.status(200).json({
          token: accessToken,
          refreshToken,
          expiresIn: config.JWT_EXPIRATION,
          tokenType: 'Bearer',
        });
      } catch (error) {
        console.error('[auth/token] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // POST /auth/refresh – Exchange a valid refresh token for a new pair
  // -----------------------------------------------------------------------
  router.post(
    '/refresh',
    validate(refreshRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { refreshToken } = req.body;

        let decoded: TokenPayload;
        try {
          decoded = verifyToken(refreshToken);
        } catch {
          res.status(401).json({ error: 'Invalid or expired refresh token' });
          return;
        }

        if (decoded.type !== 'refresh') {
          res.status(400).json({ error: 'Provided token is not a refresh token' });
          return;
        }

        // Check blacklist
        const isBlacklisted = await redis.get(`token:blacklist:${decoded.jti}`);
        if (isBlacklisted) {
          res.status(401).json({ error: 'Refresh token has been revoked' });
          return;
        }

        // Blacklist the old refresh token so it cannot be reused
        const ttl = remainingTtl(decoded);
        if (ttl > 0) {
          await redis.set(`token:blacklist:${decoded.jti}`, '1', 'EX', ttl);
        }

        // Issue new pair
        const newJti = uuidv4();
        const newRefreshJti = uuidv4();

        const basePayload = {
          sub: decoded.sub,
          iss: decoded.iss as string,
          jti: newJti,
          ...(decoded.role && { role: decoded.role }),
          ...(decoded.grants && { grants: decoded.grants }),
        };

        const newAccessToken = signAccessToken(basePayload);
        const newRefreshToken = signRefreshToken({ ...basePayload, jti: newRefreshJti });

        res.status(200).json({
          token: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.JWT_EXPIRATION,
          tokenType: 'Bearer',
        });
      } catch (error) {
        console.error('[auth/refresh] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // POST /auth/revoke – Blacklist a token by its JTI
  // -----------------------------------------------------------------------
  router.post(
    '/revoke',
    validate(revokeRequestSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { token } = req.body;

        let decoded: TokenPayload;
        try {
          decoded = verifyToken(token);
        } catch {
          // Even if the token is expired we can still decode it to get the jti
          try {
            decoded = jwt.decode(token) as TokenPayload;
            if (!decoded || !decoded.jti) {
              res.status(400).json({ error: 'Malformed token' });
              return;
            }
          } catch {
            res.status(400).json({ error: 'Malformed token' });
            return;
          }
        }

        const ttl = remainingTtl(decoded);
        if (ttl > 0) {
          await redis.set(`token:blacklist:${decoded.jti}`, '1', 'EX', ttl);
        } else {
          // Token already expired – still acknowledge the revocation
          await redis.set(`token:blacklist:${decoded.jti}`, '1', 'EX', 60);
        }

        res.status(200).json({ revoked: true });
      } catch (error) {
        console.error('[auth/revoke] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // GET /auth/validate – Internal endpoint: verify token from Authorization
  // -----------------------------------------------------------------------
  router.get(
    '/validate',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          res.status(401).json({ error: 'Authorization header is required' });
          return;
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
          res.status(401).json({ error: 'Authorization header must be: Bearer <token>' });
          return;
        }

        const token = parts[1];

        let decoded: TokenPayload;
        try {
          decoded = verifyToken(token);
        } catch {
          res.status(401).json({ error: 'Invalid or expired token' });
          return;
        }

        if (decoded.type !== 'access') {
          res.status(400).json({ error: 'Provided token is not an access token' });
          return;
        }

        // Check blacklist
        const isBlacklisted = await redis.get(`token:blacklist:${decoded.jti}`);
        if (isBlacklisted) {
          res.status(401).json({ error: 'Token has been revoked' });
          return;
        }

        res.status(200).json({
          valid: true,
          payload: {
            sub: decoded.sub,
            iss: decoded.iss,
            jti: decoded.jti,
            iat: decoded.iat,
            exp: decoded.exp,
            role: decoded.role,
            grants: decoded.grants,
          },
        });
      } catch (error) {
        console.error('[auth/validate] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  return router;
}
