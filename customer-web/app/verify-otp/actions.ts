'use server';

import { redirect } from 'next/navigation';
import { BACKEND_URL } from '@/lib/config';

export interface VerifyOtpState {
  error?: string;
}

// Req 2, 3: verify the 6-digit code (no token returned here either — only
// /auth/login issues one), then hand off to login with a success banner.
export async function verifyOtpAction(
  _prevState: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const phoneNumber = String(formData.get('phone_number') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();

  if (!phoneNumber || !code) {
    return { error: 'Phone number and code are required.' };
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, code }),
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
        : 'Invalid or expired code.';
    return { error: message };
  }

  redirect('/login?verified=1');
}
