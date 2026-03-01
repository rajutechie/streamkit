export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true,
};

export class RetryPolicy {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  getDelay(attempt: number): number {
    const exponential = this.config.baseDelay * Math.pow(2, attempt);
    const capped = Math.min(exponential, this.config.maxDelay);

    if (this.config.jitter) {
      return capped * (0.5 + Math.random() * 0.5);
    }
    return capped;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.config.maxRetries;
  }

  async execute<T>(fn: () => Promise<T>, shouldRetry?: (error: unknown) => boolean): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt >= this.config.maxRetries) break;
        if (shouldRetry && !shouldRetry(error)) break;

        const delay = this.getDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
