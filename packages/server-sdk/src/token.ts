import jwt from 'jsonwebtoken';

export interface TokenGeneratorConfig {
  apiKey: string;
  apiSecret: string;
}

export interface TokenClaims {
  userId: string;
  name?: string;
  role?: string;
  expiresIn?: string | number;
  grants?: Record<string, string[]>;
}

export class TokenGenerator {
  private apiKey: string;
  private apiSecret: string;

  constructor(config: TokenGeneratorConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  generate(claims: TokenClaims): string {
    const payload: Record<string, unknown> = {
      sub: claims.userId,
      role: claims.role ?? 'user',
    };

    if (claims.name) payload['name'] = claims.name;
    if (claims.grants) payload['grants'] = claims.grants;

    return jwt.sign(payload, this.apiSecret, {
      issuer: this.apiKey,
      expiresIn: claims.expiresIn ?? '1h',
      algorithm: 'HS256',
    });
  }

  verify(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.apiSecret, {
      issuer: this.apiKey,
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
  }
}
