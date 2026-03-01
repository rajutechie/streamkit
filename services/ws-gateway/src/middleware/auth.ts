import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Decoded JWT user payload attached to socket.data.user after successful auth.
 */
export interface AuthUser {
  userId: string;
  role: string;
  appId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Socket.IO middleware that validates a JWT from socket.handshake.auth.token.
 *
 * On success the decoded payload is attached to socket.data.user so every
 * downstream handler can access the authenticated identity without re-parsing.
 *
 * On failure the connection is rejected with a structured error.
 */
export function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    const err = new Error('Authentication required: provide auth.token during handshake');
    (err as Error & { data: unknown }).data = { code: 'AUTH_MISSING_TOKEN' };
    next(err);
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;

    if (!decoded.userId) {
      const err = new Error('Invalid token payload: missing userId');
      (err as Error & { data: unknown }).data = { code: 'AUTH_INVALID_PAYLOAD' };
      next(err);
      return;
    }

    socket.data.user = decoded;
    next();
  } catch (jwtError) {
    const message =
      jwtError instanceof jwt.TokenExpiredError
        ? 'Token has expired'
        : jwtError instanceof jwt.NotBeforeError
          ? 'Token is not yet valid'
          : 'Invalid authentication token';

    const err = new Error(message);
    (err as Error & { data: unknown }).data = {
      code:
        jwtError instanceof jwt.TokenExpiredError
          ? 'AUTH_TOKEN_EXPIRED'
          : 'AUTH_INVALID_TOKEN',
    };
    next(err);
  }
}
