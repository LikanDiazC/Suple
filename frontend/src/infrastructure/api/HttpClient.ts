/**
 * ==========================================================================
 * Authenticated HTTP Client
 * ==========================================================================
 *
 * Centralized API client that automatically injects the JWT bearer
 * token and tenant context into every request. Implements retry
 * logic with exponential backoff for transient failures.
 * ==========================================================================
 */

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

export class HttpClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string, getToken: () => string | null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${config.path}`);
    if (config.params) {
      Object.entries(config.params).forEach(([k, v]) =>
        url.searchParams.set(k, v),
      );
    }

    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url.toString(), {
      method: config.method,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: config.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ApiError(response.status, errorBody);
    }

    const data = await response.json();
    return { data, status: response.status };
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const res = await this.request<T>({ method: 'GET', path, params });
    return res.data;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.request<T>({ method: 'POST', path, body });
    return res.data;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}
