import { apiFetch } from '@/lib/api';
import { formatTzs } from '@/lib/format';
import type { Order } from '@/lib/types';
import { StatusBadge } from '@/app/components/status-badge';

// Req 24: PublicOrderItem carries only product_id (no name) per
// backend/src/orders/orders.mapper.ts — rendered as a shortened id, same
// constraint mobile-app's order_detail_screen.dart already works within
// (see specs/customer-web/design.md's Order History / Detail section).
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await apiFetch<Order>(`/orders/${id}`);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>
      <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
        {order.items.map((item) => (
          <li key={item.product_id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">product #{item.product_id.slice(0, 8)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.quantity} x {formatTzs(item.unit_price)}
              </p>
            </div>
            <p className="text-sm font-medium">{formatTzs(item.subtotal)}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Delivery fee</span>
          <span>{formatTzs(order.delivery_fee)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatTzs(order.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}
