import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/session';
import { formatTzs } from '@/lib/format';
import type { Order } from '@/lib/types';
import { ProviderSelectForm } from './provider-select-form';

interface ProviderPageProps {
  searchParams: Promise<{ order_id?: string }>;
}

// Req 17: server-fetch the order + the logged-in customer's phone, hand off
// to a client form for the interactive radio/phone-number selection — same
// server-fetches/client-child split as admin-web's order-detail +
// assign-agent-form.
export default async function ProviderPage({ searchParams }: ProviderPageProps) {
  const { order_id: orderId } = await searchParams;
  if (!orderId) {
    return <p className="text-sm text-red-600 dark:text-red-400">Missing order.</p>;
  }

  const [order, session] = await Promise.all([
    apiFetch<Order>(`/orders/${orderId}`),
    getSession(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pay for order</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Total: {formatTzs(order.total_amount)}
        </p>
      </div>
      <ProviderSelectForm orderId={order.id} defaultPhone={session?.phone_number ?? ''} />
    </div>
  );
}
