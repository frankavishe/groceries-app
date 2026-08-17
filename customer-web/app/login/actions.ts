'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BACKEND_URL } from '@/lib/config';
import { SESSION_COOKIE } from '@/lib/session';

export interface LoginState {
  error?: string;
}

interface LoginResponseBody {
  access_token: string;
  user: { id: string; full_name: string; phone_number: string; role: string };
}

// Req 4-5: authenticate against the backend and store the JWT in an httpOnly
// cookie. Reject anything other than a CUSTOMER role here — inverse of
// admin-web's admin/agent-only check, same defense-in-depth reasoning (the
// proxy.ts route guard only checks for a cookie's presence, not its role, so
// this is the actual role gate for this app).
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phoneNumber = String(formData.get('phone_number') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!phoneNumber || !password) {
    return { error: 'Phone number and password are required.' };
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, password }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Could not reach the server. Please try again.' };
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : 'Invalid phone number or password.';
    return { error: message };
  }

  const body = data as LoginResponseBody;
  if (body.user.role !== 'CUSTOMER') {
    return { error: 'This account does not have storefront access.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, body.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  redirect('/');
}
