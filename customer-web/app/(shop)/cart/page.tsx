'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/components/cart-provider';
import { formatTzs } from '@/lib/format';

// Req 12-14: entirely client-state — the cart isn't a backend resource, see
// specs/customer-web/design.md's Cart section.
export default function CartPage() {
  const { items, total, setQuantity, removeItem } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Your cart is empty.</p>
        <Link href="/" className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Your cart</h1>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-3 rounded border border-gray-200 p-3 dark:border-gray-800"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.unit}</p>
              <p className="text-sm">{formatTzs(item.priceSnapshot)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
                className="h-7 w-7 rounded border border-gray-300 text-sm dark:border-gray-700"
                aria-label={`Decrease quantity of ${item.name}`}
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
                className="h-7 w-7 rounded border border-gray-300 text-sm dark:border-gray-700"
                aria-label={`Increase quantity of ${item.name}`}
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-sm text-red-600 underline dark:text-red-400"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
        <span className="text-lg font-semibold">{formatTzs(total)}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Delivery fee is added when your order is placed.
      </p>
      <button
        type="button"
        onClick={() => router.push('/checkout')}
        className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        Proceed to checkout
      </button>
    </div>
  );
}
