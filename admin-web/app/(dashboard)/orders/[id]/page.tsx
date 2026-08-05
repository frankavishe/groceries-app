import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getToken } from '@/lib/session';
import type { Order } from '@/lib/types';
import { OrderSocketRefresh } from '@/app/components/order-socket-refresh';
import { StatusBadge } from '@/app/components/status-badge';
import { AssignAgentForm } from '../assign-agent-form';
import { StatusUpdateForm } from '../status-update-form';
import { getAssignableAgents } from '../agents';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order: Order;
  try {
    order = await apiFetch<Order>(`/orders/${id}`);
  } catch (err) {
    // A malformed id (not a valid UUID) fails the backend's ParseUUIDPipe
    // with 400 before it ever gets a chance to 404 — both mean "no such
    // order to show" from this page's perspective.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }

  const itemsTotal = order.total_amount - order.delivery_fee;

  // specs/delivery/requirements.md Req 1-2: an agent can only be (re)assigned
  // once an order is being fulfilled. Also fetch agents when one's already
  // assigned (e.g. a DELIVERED order) purely to resolve its name for display.
  const canAssignAgent =
    order.status === 'PROCESSING' || order.status === 'DISPATCHED';
  const agents =
    canAssignAgent || order.assigned_agent_id
      ? await getAssignableAgents()
      : [];
  const assignedAgent = agents.find((a) => a.id === order.assigned_agent_id);
  const token = await getToken();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <OrderSocketRefresh token={token} />
      <div>
        <Link href="/orders" className="text-sm underline">
          ← Back to orders
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order {order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-gray-500 dark:text-gray-400">Customer</dt>
        <dd>{order.user_id ?? '—'}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Placed</dt>
        <dd>{new Date(order.created_at).toLocaleString()}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Payment status</dt>
        <dd>
          {order.status === 'PENDING'
            ? 'Awaiting payment'
            : order.status === 'CANCELLED'
              ? 'Not paid / cancelled'
              : 'Paid'}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">Delivery agent</dt>
        <dd>
          {assignedAgent
            ? `${assignedAgent.full_name} (${assignedAgent.phone_number})`
            : order.assigned_agent_id ?? 'Unassigned'}
        </dd>
      </dl>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="py-2 font-medium">Product</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 font-medium">Unit price</th>
            <th className="py-2 font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.product_id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2">{item.product_id.slice(0, 8)}</td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">{item.unit_price.toLocaleString()} TZS</td>
              <td className="py-2">{item.subtotal.toLocaleString()} TZS</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-2 text-right text-sm text-gray-500 dark:text-gray-400">
              Items subtotal
            </td>
            <td className="pt-2">{itemsTotal.toLocaleString()} TZS</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-right text-sm text-gray-500 dark:text-gray-400">
              Delivery fee
            </td>
            <td>{order.delivery_fee.toLocaleString()} TZS</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-right text-sm font-medium">
              Total
            </td>
            <td className="font-medium">{order.total_amount.toLocaleString()} TZS</td>
          </tr>
        </tfoot>
      </table>

      <StatusUpdateForm orderId={order.id} currentStatus={order.status} />

      {canAssignAgent && (
        <AssignAgentForm
          orderId={order.id}
          agents={agents}
          currentAgentId={order.assigned_agent_id}
        />
      )}
    </div>
  );
}
