import { ApiError, NetworkError, RajutechieStreamKitErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';
import { RetryPolicy } from './retry';
import { isRetryableError } from '../utils/errors';

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;

interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeout: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private token: string | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private retry: RetryPolicy;
  private logger: Logger;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout ?? 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.retry = new RetryPolicy({ maxRetries: 2 });
    this.logger = new Logger().child('HttpClient');
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<HttpResponse<T>> {
    let url = path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url = qs ? `${path}?${qs}` : path;
    }
    return this.request<T>('GET', url);
  }

  async post<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = { ...this.defaultHeaders };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let config: RequestConfig = {
      url,
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      timeout: this.timeout,
    };

    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    return this.retry.execute(
      async () => {
        this.logger.debug(`${config.method} ${config.url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
          const fetchResponse = await fetch(config.url, {
            method: config.method,
            headers: config.headers,
            body: config.body,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseHeaders: Record<string, string> = {};
          fetchResponse.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          const contentType = fetchResponse.headers.get('content-type') ?? '';
          const data = contentType.includes('application/json')
            ? await fetchResponse.json()
            : await fetchResponse.text();

          if (!fetchResponse.ok) {
            throw new ApiError(
              (data as Record<string, string>)?.message ?? `HTTP ${fetchResponse.status}`,
              fetchResponse.status,
              data,
            );
          }

          let response: HttpResponse<T> = {
            data: data as T,
            status: fetchResponse.status,
            headers: responseHeaders,
          };

          for (const interceptor of this.responseInterceptors) {
            response = (await interceptor(response)) as HttpResponse<T>;
          }

          return response;
        } catch (error) {
          clearTimeout(timeoutId);

          if (error instanceof ApiError) throw error;

          if (error instanceof DOMException && error.name === 'AbortError') {
            throw new NetworkError(
              `Request timeout after ${config.timeout}ms`,
              RajutechieStreamKitErrorCode.NETWORK_TIMEOUT,
            );
          }

          throw new NetworkError(
            error instanceof Error ? error.message : 'Request failed',
            RajutechieStreamKitErrorCode.NETWORK_REQUEST_FAILED,
          );
        }
      },
      (error) => isRetryableError(error),
    );
  }
}
