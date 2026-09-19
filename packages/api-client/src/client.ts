import { ErrorCodes, ErrorEnvelopeSchema } from '@app/contracts';
import type { ErrorCode } from '@app/contracts';

/**
 * The typed failure clients catch. `code` comes straight from the API's error
 * envelope, so callers branch on it rather than on the message.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Anything that can validate a value; a zod schema satisfies this as-is. */
export interface Schema<T> {
  parse(value: unknown): T;
}

export interface ApiClientOptions {
  /** Includes the API prefix, e.g. `http://localhost:3001/api/v1`. */
  baseUrl: string;
  getAccessToken?: () => string | undefined;
}

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * This package is transport, not domain. It owns exactly three things: attaching
 * auth, turning a response body into a typed value via the caller's schema, and
 * turning the error envelope into an `ApiError`.
 *
 * Resource methods (`tasks.create(...)`) belong to the app that owns the
 * resource, written on top of these helpers — that is why none ship here.
 */
export interface ApiClient {
  get<T>(path: string, schema: Schema<T>, options?: RequestOptions): Promise<T>;
  post<T>(path: string, schema: Schema<T>, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, schema: Schema<T>, options?: RequestOptions): Promise<T>;
  put<T>(path: string, schema: Schema<T>, options?: RequestOptions): Promise<T>;
  /**
   * A 204 or empty body parses as `null`, so the schema must accept it
   * (e.g. `z.null()` or `z.unknown()`).
   */
  delete<T>(path: string, schema: Schema<T>, options?: RequestOptions): Promise<T>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = async <T>(
    method: string,
    path: string,
    schema: Schema<T>,
    init: RequestOptions = {},
  ): Promise<T> => {
    const headers = new Headers(init.headers);
    const token = options.getAccessToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');

    const response = await fetch(`${options.baseUrl}${path}`, {
      method,
      headers,
      signal: init.signal,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    // Read as text first: calling .json() on an empty 204 body throws inside the
    // runtime, which would surface as an unrelated parse error.
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        // A non-JSON body (an HTML error page from a proxy, say) is handled by
        // the envelope check below rather than thrown as a SyntaxError.
        payload = text;
      }
    }

    if (!response.ok) {
      const envelope = ErrorEnvelopeSchema.safeParse(payload);
      if (envelope.success) {
        throw new ApiError(
          response.status,
          envelope.data.error.code,
          envelope.data.error.message,
          envelope.data.error.details,
        );
      }
      throw new ApiError(
        response.status,
        ErrorCodes.INTERNAL,
        `Unexpected response (${response.status})`,
      );
    }

    // The caller's schema is the runtime guard. A server that has drifted from
    // the contract raises here rather than leaking a malformed object upward.
    return schema.parse(payload);
  };

  return {
    get: (path, schema, init) => request('GET', path, schema, init),
    post: (path, schema, init) => request('POST', path, schema, init),
    patch: (path, schema, init) => request('PATCH', path, schema, init),
    put: (path, schema, init) => request('PUT', path, schema, init),
    delete: (path, schema, init) => request('DELETE', path, schema, init),
  };
}
