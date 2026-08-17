import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatTzs } from '@/lib/format';
import type { Order } from '@/lib/types';

// Req 19: reached only after polling confirms SUCCESSFUL and the cart has
// been cleared (see pending-client.tsx).
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await apiFetch<Order>(`/orders/${orderId}`);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-16 text-center">
      <p className="text-4xl">✅</p>
      <h1 className="text-xl font-semibold">Order placed!</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Order #{order.id.slice(0, 8)} · {formatTzs(order.total_amount)}
      </p>
      <div className="flex gap-3">
        <Link
          href={`/orders/${order.id}`}
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          View order
        </Link>
        <Link href="/" className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
          Back to shopping
        </Link>
      </div>
    </div>
  );
}
