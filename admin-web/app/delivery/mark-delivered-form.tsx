'use client';

import { useActionState } from 'react';
import { markDeliveredAction, type MarkDeliveredState } from './actions';

const initialState: MarkDeliveredState = {};

export function MarkDeliveredForm({ orderId }: { orderId: string }) {
  const action = markDeliveredAction.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? 'Marking…' : 'Mark delivered'}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
