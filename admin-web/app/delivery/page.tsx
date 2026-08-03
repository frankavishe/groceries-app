import { apiFetch } from '@/lib/api';
import type { Order } from '@/lib/types';
import { PollingRefresh } from '@/app/components/polling-refresh';
import { StatusBadge } from '@/app/components/status-badge';
import { MarkDeliveredForm } from './mark-delivered-form';

// specs/delivery/requirements.md Req 4-6: an agent's own assigned orders,
// DISPATCHED (their active queue) first, with the only action available
// being marking a DISPATCHED order DELIVERED. No route optimization, map, or
// earnings view — out of MVP scope per specs/constitution.md.
export default async function DeliveryPage() {
  const orders = await apiFetch<Order[]>('/delivery/my-orders');

  return (
    <div className="flex flex-col gap-6">
      <PollingRefresh />
      <h1 className="text-xl font-semibold">My Deliveries</h1>

      {orders.length === 0 && (
        <p className="text-sm text-gray-500">No orders assigned to you.</p>
      )}

      <ul className="flex flex-col gap-4">
        {orders.map((order) => (
          <li
            key={order.id}
            className="flex items-center justify-between rounded border border-gray-200 px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Order {order.id.slice(0, 8)}</span>
                <StatusBadge status={order.status} />
              </div>
              <span className="text-sm text-gray-500">
                {order.total_amount.toLocaleString()} TZS ·{' '}
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
            {order.status === 'DISPATCHED' && (
              <MarkDeliveredForm orderId={order.id} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
