import type { OrderStatus } from '@/lib/order-status';

const COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  PROCESSING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${COLORS[status]}`}>{status}</span>
  );
}
