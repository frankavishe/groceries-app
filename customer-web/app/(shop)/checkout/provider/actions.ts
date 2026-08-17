'use server';

import { apiFetch, ApiError } from '@/lib/api';
import type { PaymentProvider, PaymentTransaction } from '@/lib/types';

export interface InitiatePaymentResult {
  ok: boolean;
  error?: string;
}

// Req 17: POST /payments/initiate for the given order. Also used by the
// pending screen's "Try again" action for the same order_id (Req 20-21) — no
// new order is created, per specs/payments/design.md.
export async function initiatePaymentAction(
  orderId: string,
  provider: PaymentProvider,
  phoneNumber: string,
): Promise<InitiatePaymentResult> {
  try {
    await apiFetch<PaymentTransaction>('/payments/initiate', {
      method: 'POST',
      body: { order_id: orderId, provider, phone_number: phoneNumber },
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
