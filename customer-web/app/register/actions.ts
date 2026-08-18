'use server';

import { redirect } from 'next/navigation';
import { BACKEND_URL } from '@/lib/config';

export interface RegisterState {
  error?: string;
}

interface RegisterResponseBody {
  id: string;
  full_name: string;
  phone_number: string;
  message: string;
}

// Req 1, 3: register against the backend directly (no cookie exists yet —
// register returns no token, only /auth/login does, per
// specs/customer-web/design.md's Auth Integration section), then hand off to
// the OTP step for this phone number.
export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phoneNumber = String(formData.get('phone_number') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!fullName || !phoneNumber || !password) {
    return { error: 'Full name, phone number, and password are required.' };
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        phone_number: phoneNumber,
        password,
      }),
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
        : 'Could not register. Please check your details and try again.';
    return { error: message };
  }

  const body = data as RegisterResponseBody;
  redirect(`/verify-otp?phone=${encodeURIComponent(body.phone_number)}`);
}
