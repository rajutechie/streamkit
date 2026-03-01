export interface JwtPayload {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
  grants?: {
    chat?: string[];
    call?: string[];
    meeting?: string[];
    stream?: string[];
  };
  [key: string]: unknown;
}

export function decodeJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = parts[1];
  const decoded = typeof atob === 'function'
    ? atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    : Buffer.from(payload, 'base64url').toString('utf-8');

  return JSON.parse(decoded) as JwtPayload;
}

export function isTokenExpired(token: string, bufferSeconds: number = 30): boolean {
  try {
    const payload = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now + bufferSeconds;
  } catch {
    return true;
  }
}

export function getTokenExpiresIn(token: string): number {
  try {
    const payload = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
  } catch {
    return 0;
  }
}
