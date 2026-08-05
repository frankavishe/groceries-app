import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { Paginated, PaymentProvider, PaymentProviderSummary, PaymentStatus, PaymentTransaction } from '@/lib/types';
import { PaymentStatusBadge, providerLabel } from './provider-status-badges';

const PROVIDERS: PaymentProvider[] = ['MPESA', 'MIXX_BY_YAS', 'AIRTEL_MONEY'];
const STATUSES: PaymentStatus[] = ['INITIATED', 'PENDING', 'SUCCESSFUL', 'FAILED'];

interface TransactionsPageProps {
  searchParams: Promise<{ page?: string; provider?: string; status?: string }>;
}

// specs/admin-web/requirements.md Req 9-10: a filterable transaction list
// plus a per-provider summary — deferred at M5 since specs/payments hadn't
// been built yet (backend/src/payments, M8), now unblocked.
export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (params.provider) query.set('provider', params.provider);
  if (params.status) query.set('status', params.status);

  const [summary, result] = await Promise.all([
    apiFetch<PaymentProviderSummary[]>('/payments/summary'),
    apiFetch<Paginated<PaymentTransaction>>(`/payments/transactions?${query}`),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Transactions</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const row = summary.find((s) => s.provider === provider);
          return (
            <div
              key={provider}
              className="rounded border border-gray-200 px-4 py-3 dark:border-gray-800"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {providerLabel(provider)}
              </div>
              <div className="text-lg font-semibold">
                {(row?.total_amount ?? 0).toLocaleString()} TZS
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {row?.count ?? 0} transactions
              </div>
            </div>
          );
        })}
      </div>

      <form className="flex items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm">
          Provider
          <select
            name="provider"
            defaultValue={params.provider ?? ''}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
          >
            <option value="">All providers</option>
            {PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {providerLabel(provider)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
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
            <th className="py-2 font-medium">Provider</th>
            <th className="py-2 font-medium">Phone</th>
            <th className="py-2 font-medium">Amount</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((transaction) => (
            <tr key={transaction.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2">
                <Link href={`/orders/${transaction.order_id}`} className="underline">
                  {transaction.order_id.slice(0, 8)}
                </Link>
              </td>
              <td className="py-2">{providerLabel(transaction.provider)}</td>
              <td className="py-2">{transaction.phone_number}</td>
              <td className="py-2">{transaction.amount.toLocaleString()} TZS</td>
              <td className="py-2">
                <PaymentStatusBadge status={transaction.status} />
              </td>
              <td className="py-2">{new Date(transaction.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.data.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No transactions found.</p>
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

function buildPageHref(
  params: { provider?: string; status?: string },
  page: number,
): string {
  const query = new URLSearchParams();
  if (params.provider) query.set('provider', params.provider);
  if (params.status) query.set('status', params.status);
  query.set('page', String(page));
  return `/transactions?${query}`;
}
