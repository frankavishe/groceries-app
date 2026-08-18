'use server';

import { apiFetch, ApiError } from '@/lib/api';
import type { PaymentTransaction } from '@/lib/types';

export interface PollResult {
  ok: boolean;
  transaction?: PaymentTransaction;
  error?: string;
}

// Req 18: polled repeatedly by pending-client.tsx as a Server Action call
// (not a client-side fetch to the backend) so the JWT never leaves the
// server even on this stateful, timed screen — see
// specs/customer-web/design.md's Checkout → Payment section.
export async function pollPaymentStatusAction(orderId: string): Promise<PollResult> {
  try {
    const transaction = await apiFetch<PaymentTransaction>(`/payments/${orderId}/status`);
    return { ok: true, transaction };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
