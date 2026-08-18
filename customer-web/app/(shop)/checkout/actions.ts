'use server';

import { apiFetch, ApiError } from '@/lib/api';
import type { Order } from '@/lib/types';

export interface CreateOrderResult {
  order?: Order;
  error?: string;
}

interface InsufficientStockItem {
  product_id: string;
  requested: number;
  available: number;
}

// Req 15-16: POST /orders with just {product_id, quantity} pairs — the
// server computes pricing/fees and does the stock-lock (no cart concept
// server-side, per specs/customer-web/design.md). Mirrors
// checkout_screen.dart's _describeError for the 409 INSUFFICIENT_STOCK case.
export async function createOrderAction(
  items: { product_id: string; quantity: number }[],
): Promise<CreateOrderResult> {
  try {
    const order = await apiFetch<Order>('/orders', {
      method: 'POST',
      body: { items },
    });
    return { order };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: describeOrderError(err) };
    }
    throw err;
  }
}

function describeOrderError(err: ApiError): string {
  if (err.code === 'INSUFFICIENT_STOCK') {
    const details = err.details as { items?: InsufficientStockItem[] } | undefined;
    const items = details?.items;
    if (items && items.length > 0) {
      const lines = items
        .map((i) => `${i.product_id} (wanted ${i.requested}, only ${i.available} left)`)
        .join('\n');
      return `Some items are no longer available in the quantity you selected:\n${lines}`;
    }
  }
  return err.message;
}
