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

// Server-only fetch wrapper: attaches the admin's JWT from the httpOnly
// cookie and calls the NestJS API directly, per specs/admin-web/design.md's
// "Data Fetching" section. `body` may be a plain JSON-serializable value or a
// FormData (for the image-upload endpoints), never a browser File reference.
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
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
