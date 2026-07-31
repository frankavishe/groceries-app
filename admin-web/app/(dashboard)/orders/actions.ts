'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import type { Order } from '@/lib/types';
import type { OrderStatus } from '@/lib/order-status';

export interface UpdateStatusState {
  error?: string;
}

// Req 7: status update, constrained client-side to ORDER_STATUS_TRANSITIONS
// (lib/order-status.ts) — the backend re-validates against the same table
// (backend/src/orders/order-status.transitions.ts) regardless.
export async function updateOrderStatusAction(
  orderId: string,
  _prevState: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  const status = String(formData.get('status') ?? '') as OrderStatus;
  if (!status) {
    return { error: 'Select a status.' };
  }

  try {
    await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status },
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  return {};
}
