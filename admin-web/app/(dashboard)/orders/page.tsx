import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ORDER_STATUSES } from '@/lib/order-status';
import { getToken } from '@/lib/session';
import type { Order, Paginated } from '@/lib/types';
import { OrderSocketRefresh } from '@/app/components/order-socket-refresh';
import { StatusBadge } from '@/app/components/status-badge';

interface OrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (params.status) query.set('status', params.status);

  const result = await apiFetch<Paginated<Order>>(`/orders?${query}`);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const token = await getToken();

  return (
    <div className="flex flex-col gap-6">
      <OrderSocketRefresh token={token} />
      <h1 className="text-xl font-semibold">Orders</h1>

      <form className="flex items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        >
          Filter
        </button>
      </form>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="py-2 font-medium">Order</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Total</th>
            <th className="py-2 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((order) => (
            <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2">
                <Link href={`/orders/${order.id}`} className="underline">
                  {order.id.slice(0, 8)}
                </Link>
              </td>
              <td className="py-2">
                <StatusBadge status={order.status} />
              </td>
              <td className="py-2">{order.total_amount.toLocaleString()} TZS</td>
              <td className="py-2">{new Date(order.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.data.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No orders found.</p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={buildPageHref(params, page - 1)} className="underline">
              ← Previous
            </Link>
          )}
          <span className="text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildPageHref(params, page + 1)} className="underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function buildPageHref(params: { status?: string }, page: number): string {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  query.set('page', String(page));
  return `/orders?${query}`;
}
