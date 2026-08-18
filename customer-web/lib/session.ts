import { cookies } from 'next/headers';

// Distinct from admin-web's `admin_token` so the two cookies can never
// collide if the apps are ever deployed on the same domain.
export const SESSION_COOKIE = 'customer_token';

export interface CustomerSession {
  sub: string;
  role: 'CUSTOMER';
  phone_number: string;
}

// The JWT signature is verified by the backend on every API call this app
// makes; decoding here (no verification) is only used for UI (e.g.
// pre-filling the checkout phone field) and is never treated as a security
// boundary on its own.
function decodeJwtPayload(token: string): CustomerSession | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(json) as CustomerSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeJwtPayload(token);
}

export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
