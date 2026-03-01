/**
 * RajutechieStreamKit Error Hierarchy
 *
 * Provides structured, typed errors for all SDK operations.
 * Each error carries a machine-readable code and optional metadata
 * to support programmatic error handling by consumers.
 */

export enum RajutechieStreamKitErrorCode {
  // Generic
  UNKNOWN = 'UNKNOWN',
  INTERNAL = 'INTERNAL',

  // Auth
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_REFRESH_FAILED = 'AUTH_REFRESH_FAILED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',

  // Network
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',
  NETWORK_WEBSOCKET_ERROR = 'NETWORK_WEBSOCKET_ERROR',
  NETWORK_WEBSOCKET_CLOSED = 'NETWORK_WEBSOCKET_CLOSED',

  // Validation
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_CONSTRAINT = 'VALIDATION_CONSTRAINT',

  // API
  API_BAD_REQUEST = 'API_BAD_REQUEST',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_CONFLICT = 'API_CONFLICT',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_SERVICE_UNAVAILABLE = 'API_SERVICE_UNAVAILABLE',

  // Module-specific
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  CALL_ALREADY_ACTIVE = 'CALL_ALREADY_ACTIVE',
  CALL_NOT_FOUND = 'CALL_NOT_FOUND',
  MEETING_NOT_FOUND = 'MEETING_NOT_FOUND',
  MEETING_FULL = 'MEETING_FULL',
  STREAM_NOT_FOUND = 'STREAM_NOT_FOUND',
}

/**
 * Base error class for all RajutechieStreamKit errors.
 */
export class RajutechieStreamKitError extends Error {
  public readonly code: RajutechieStreamKitErrorCode;
  public readonly timestamp: Date;
  public readonly metadata: Record<string, unknown>;

  constructor(
    message: string,
    code: RajutechieStreamKitErrorCode = RajutechieStreamKitErrorCode.UNKNOWN,
    metadata: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'RajutechieStreamKitError';
    this.code = code;
    this.timestamp = new Date();
    this.metadata = metadata;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
    };
  }
}

/**
 * Authentication and authorization errors.
 */
export class AuthError extends RajutechieStreamKitError {
  constructor(
    message: string,
    code:
      | RajutechieStreamKitErrorCode.AUTH_TOKEN_EXPIRED
      | RajutechieStreamKitErrorCode.AUTH_TOKEN_INVALID
      | RajutechieStreamKitErrorCode.AUTH_TOKEN_MISSING
      | RajutechieStreamKitErrorCode.AUTH_REFRESH_FAILED
      | RajutechieStreamKitErrorCode.AUTH_UNAUTHORIZED = RajutechieStreamKitErrorCode.AUTH_UNAUTHORIZED,
    metadata: Record<string, unknown> = {},
  ) {
    super(message, code, metadata);
    this.name = 'AuthError';
  }
}

/**
 * Network-level errors (offline, timeout, WebSocket failures).
 */
export class NetworkError extends RajutechieStreamKitError {
  public readonly retryable: boolean;

  constructor(
    message: string,
    code:
      | RajutechieStreamKitErrorCode.NETWORK_OFFLINE
      | RajutechieStreamKitErrorCode.NETWORK_TIMEOUT
      | RajutechieStreamKitErrorCode.NETWORK_REQUEST_FAILED
      | RajutechieStreamKitErrorCode.NETWORK_WEBSOCKET_ERROR
      | RajutechieStreamKitErrorCode.NETWORK_WEBSOCKET_CLOSED = RajutechieStreamKitErrorCode.NETWORK_REQUEST_FAILED,
    metadata: Record<string, unknown> = {},
    retryable: boolean = true,
  ) {
    super(message, code, metadata);
    this.name = 'NetworkError';
    this.retryable = retryable;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryable: this.retryable,
    };
  }
}

/**
 * Client-side validation errors.
 */
export class ValidationError extends RajutechieStreamKitError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    code:
      | RajutechieStreamKitErrorCode.VALIDATION_REQUIRED_FIELD
      | RajutechieStreamKitErrorCode.VALIDATION_INVALID_FORMAT
      | RajutechieStreamKitErrorCode.VALIDATION_CONSTRAINT = RajutechieStreamKitErrorCode.VALIDATION_CONSTRAINT,
    metadata: Record<string, unknown> = {},
  ) {
    super(message, code, { ...metadata, field });
    this.name = 'ValidationError';
    this.field = field;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * API response errors (HTTP 4xx/5xx from the RajutechieStreamKit backend).
 */
export class ApiError extends RajutechieStreamKitError {
  public readonly statusCode: number;
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number,
    responseBody?: unknown,
    code?: RajutechieStreamKitErrorCode,
    metadata: Record<string, unknown> = {},
  ) {
    const resolvedCode = code ?? ApiError.codeFromStatus(statusCode);
    super(message, resolvedCode, { ...metadata, statusCode });
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  private static codeFromStatus(status: number): RajutechieStreamKitErrorCode {
    switch (status) {
      case 400:
        return RajutechieStreamKitErrorCode.API_BAD_REQUEST;
      case 401:
        return RajutechieStreamKitErrorCode.AUTH_UNAUTHORIZED;
      case 403:
        return RajutechieStreamKitErrorCode.AUTH_UNAUTHORIZED;
      case 404:
        return RajutechieStreamKitErrorCode.API_NOT_FOUND;
      case 409:
        return RajutechieStreamKitErrorCode.API_CONFLICT;
      case 429:
        return RajutechieStreamKitErrorCode.API_RATE_LIMITED;
      case 503:
        return RajutechieStreamKitErrorCode.API_SERVICE_UNAVAILABLE;
      default:
        return status >= 500
          ? RajutechieStreamKitErrorCode.API_SERVER_ERROR
          : RajutechieStreamKitErrorCode.API_BAD_REQUEST;
    }
  }

  get isRetryable(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      responseBody: this.responseBody,
    };
  }
}

/**
 * Determine whether an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return error.retryable;
  }
  if (error instanceof ApiError) {
    return error.isRetryable;
  }
  return false;
}
