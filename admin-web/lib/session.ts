import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'admin_token';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'DELIVERY_AGENT';

export interface AdminSession {
  sub: string;
  role: UserRole;
  phone_number: string;
  full_name?: string;
}

// The JWT signature is verified by the backend on every API call this app
// makes; decoding here (no verification) is only used for UI role-gating
// (proxy.ts, nav) and is never treated as a security boundary on its own.
function decodeJwtPayload(token: string): AdminSession | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(json) as AdminSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeJwtPayload(token);
}

export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
