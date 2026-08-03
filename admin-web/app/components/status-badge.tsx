import type { OrderStatus } from '@/lib/order-status';

const COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  DISPATCHED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${COLORS[status]}`}>{status}</span>
  );
}
