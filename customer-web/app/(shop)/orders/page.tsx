import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatTzs } from '@/lib/format';
import type { Order, Paginated } from '@/lib/types';
import { StatusBadge } from '@/app/components/status-badge';

// Req 23: GET /orders is role-scoped to the caller's own orders for
// CUSTOMER callers (backend/src/orders/orders.service.ts's findMany), same
// Paginated<Order> envelope as the admin list view.
export default async function OrdersPage() {
  const orders = await apiFetch<Paginated<Order>>('/orders?pageSize=50');

  if (orders.data.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-gray-500 dark:text-gray-400">
        No orders yet.
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <h1 className="text-xl font-semibold">Order history</h1>
      <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
        {orders.data.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(order.created_at).toLocaleString()} · {order.items.length} item(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{formatTzs(order.total_amount)}</span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
