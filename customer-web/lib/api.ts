import { cookies } from 'next/headers';
import { BACKEND_URL } from './config';
import { SESSION_COOKIE } from './session';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

// Server-only fetch wrapper (same pattern as admin-web/lib/api.ts): attaches
// the customer's JWT from the httpOnly cookie and calls the NestJS API
// directly. Used for every call this app makes, including the public
// GET /products and GET /categories endpoints — see
// specs/customer-web/design.md's "Data Fetching" section for why one fetch
// path is used throughout rather than forking a separate unauthenticated
// helper.
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    body,
    cache: 'no-store',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data?.error as string) ?? 'UNKNOWN_ERROR',
      (data?.message as string) ?? res.statusText,
      data?.details,
    );
  }

  return data as T;
}
