'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import type { Order } from '@/lib/types';

export interface MarkDeliveredState {
  error?: string;
}

// specs/delivery/requirements.md Req 5: the same PATCH /orders/:id/status
// endpoint the admin dashboard uses, but the backend only accepts
// DISPATCHED -> DELIVERED here since the caller's role is DELIVERY_AGENT.
export async function markDeliveredAction(
  orderId: string,
  _prevState: MarkDeliveredState,
): Promise<MarkDeliveredState> {
  try {
    await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status: 'DELIVERED' },
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath('/delivery');
  return {};
}
