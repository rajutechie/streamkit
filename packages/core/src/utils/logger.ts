/**
 * RajutechieStreamKit Logger
 *
 * Configurable logger with level filtering.
 * Works in both browser and Node.js environments.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  /** Minimum level to output. Default: WARN */
  level: LogLevel;
  /** Prefix prepended to all messages. Default: "[RajutechieStreamKit]" */
  prefix: string;
  /** Whether to include timestamps. Default: true */
  timestamps: boolean;
  /** Custom handler that receives all log calls. When set, console output is suppressed. */
  handler?: LogHandler;
}

export type LogHandler = (
  level: LogLevel,
  message: string,
  args: unknown[],
  timestamp: Date,
) => void;

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.WARN,
  prefix: '[RajutechieStreamKit]',
  timestamps: true,
};

/**
 * A lightweight logger supporting level-based filtering, prefixes, and custom handlers.
 *
 * Usage:
 * ```ts
 * const logger = new Logger({ level: LogLevel.DEBUG });
 * logger.debug('socket connected', { id: 'abc' });
 * logger.error('connection failed', err);
 * ```
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Replace the current configuration (partial merge). */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get the current log level. */
  get level(): LogLevel {
    return this.config.level;
  }

  /** Set the log level. */
  set level(level: LogLevel) {
    this.config.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, args);
  }

  /**
   * Create a child logger with an extended prefix.
   *
   * ```ts
   * const child = logger.child('ChatModule');
   * child.info('initialized'); // [RajutechieStreamKit][ChatModule] initialized
   * ```
   */
  child(name: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix}[${name}]`,
    });
  }

  // ------------------------------------------------------------------
  // Internal
  // ------------------------------------------------------------------

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (level < this.config.level) {
      return;
    }

    const now = new Date();

    // Delegate to custom handler if provided
    if (this.config.handler) {
      this.config.handler(level, `${this.config.prefix} ${message}`, args, now);
      return;
    }

    const parts: string[] = [];

    if (this.config.timestamps) {
      parts.push(now.toISOString());
    }

    parts.push(this.config.prefix);
    parts.push(this.levelLabel(level));
    parts.push(message);

    const formatted = parts.join(' ');

    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formatted, ...args);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formatted, ...args);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formatted, ...args);
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(formatted, ...args);
        break;
    }
  }

  private levelLabel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '[DEBUG]';
      case LogLevel.INFO:
        return '[INFO]';
      case LogLevel.WARN:
        return '[WARN]';
      case LogLevel.ERROR:
        return '[ERROR]';
      default:
        return '[LOG]';
    }
  }
}

/**
 * Shared default logger instance used internally by the SDK.
 * Consumers can reconfigure via `defaultLogger.configure(...)`.
 */
export const defaultLogger = new Logger();
