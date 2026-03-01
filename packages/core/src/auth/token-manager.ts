import { isTokenExpired, getTokenExpiresIn } from './jwt';
import { AuthError, RajutechieStreamKitErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';

export type TokenRefreshFn = (currentToken: string) => Promise<string>;

export class TokenManager {
  private token: string | null = null;
  private refreshFn: TokenRefreshFn | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshPromise: Promise<string> | null = null;
  private logger: Logger;
  private onTokenChange?: (token: string | null) => void;

  constructor(onTokenChange?: (token: string | null) => void) {
    this.logger = new Logger().child('TokenManager');
    this.onTokenChange = onTokenChange;
  }

  setToken(token: string): void {
    this.token = token;
    this.onTokenChange?.(token);
    this.scheduleRefresh();
  }

  getToken(): string {
    if (!this.token) {
      throw new AuthError('No token set', RajutechieStreamKitErrorCode.AUTH_TOKEN_MISSING);
    }
    if (isTokenExpired(this.token, 0)) {
      throw new AuthError('Token expired', RajutechieStreamKitErrorCode.AUTH_TOKEN_EXPIRED);
    }
    return this.token;
  }

  hasToken(): boolean {
    return this.token !== null && !isTokenExpired(this.token, 0);
  }

  setRefreshFunction(fn: TokenRefreshFn): void {
    this.refreshFn = fn;
  }

  async getValidToken(): Promise<string> {
    if (!this.token) {
      throw new AuthError('No token set', RajutechieStreamKitErrorCode.AUTH_TOKEN_MISSING);
    }

    if (isTokenExpired(this.token)) {
      return this.refreshToken();
    }

    return this.token;
  }

  clear(): void {
    this.token = null;
    this.refreshPromise = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.onTokenChange?.(null);
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshFn || !this.token) {
      throw new AuthError('Cannot refresh token', RajutechieStreamKitErrorCode.AUTH_REFRESH_FAILED);
    }

    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<string> {
    try {
      this.logger.debug('Refreshing token');
      const newToken = await this.refreshFn!(this.token!);
      this.token = newToken;
      this.onTokenChange?.(newToken);
      this.scheduleRefresh();
      this.logger.debug('Token refreshed');
      return newToken;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw new AuthError(
        'Token refresh failed',
        RajutechieStreamKitErrorCode.AUTH_REFRESH_FAILED,
        { originalError: error },
      );
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.token || !this.refreshFn) return;

    const expiresIn = getTokenExpiresIn(this.token);
    // Refresh when 80% of the token lifetime has passed
    const refreshIn = Math.max(0, (expiresIn * 0.8) * 1000);

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch((err) => {
          this.logger.error('Scheduled token refresh failed', err);
        });
      }, refreshIn);
    }
  }
}
