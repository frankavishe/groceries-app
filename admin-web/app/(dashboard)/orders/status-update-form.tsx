'use client';

import { useActionState } from 'react';
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@/lib/order-status';
import { updateOrderStatusAction, type UpdateStatusState } from './actions';

const initialState: UpdateStatusState = {};

export function StatusUpdateForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const nextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];
  const action = updateOrderStatusAction.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (nextStatuses.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No further status transitions available.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Update status
        <select
          name="status"
          defaultValue=""
          required
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        >
          <option value="" disabled>
            Select…
          </option>
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? 'Updating…' : 'Update'}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
