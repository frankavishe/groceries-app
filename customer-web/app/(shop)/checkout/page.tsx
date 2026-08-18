'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/app/components/cart-provider';
import { formatTzs } from '@/lib/format';
import { createOrderAction } from './actions';

// Req 15-16: review cart, place order.
export default function CheckoutPage() {
  const { items, total } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    const result = await createOrderAction(
      items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    );
    setSubmitting(false);
    if (result.error || !result.order) {
      setError(result.error ?? 'Could not place the order. Please try again.');
      return;
    }
    router.push(`/checkout/provider?order_id=${result.order.id}`);
  }

  if (items.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-gray-500 dark:text-gray-400">
        Your cart is empty.
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Checkout</h1>
      <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.quantity} x {formatTzs(item.priceSnapshot)}
              </p>
            </div>
            <p className="text-sm font-medium">
              {formatTzs(item.priceSnapshot * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
        <span className="text-lg font-semibold">{formatTzs(total)}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Delivery fee is added by the server at order time.
      </p>
      {error && (
        <p role="alert" className="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={placeOrder}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitting ? 'Placing order…' : 'Place order'}
      </button>
    </div>
  );
}
