'use client';

import { useActionState } from 'react';
import type { DeliveryAgent } from '@/lib/types';
import { assignAgentAction, type AssignAgentState } from './actions';

const initialState: AssignAgentState = {};

export function AssignAgentForm({
  orderId,
  agents,
  currentAgentId,
}: {
  orderId: string;
  agents: DeliveryAgent[];
  currentAgentId: string | null;
}) {
  const action = assignAgentAction.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (agents.length === 0) {
    return <p className="text-sm text-gray-500">No delivery agents available.</p>;
  }

  return (
    <form action={formAction} className="flex items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {currentAgentId ? 'Reassign delivery agent' : 'Assign delivery agent'}
        <select
          name="agent_id"
          defaultValue={currentAgentId ?? ''}
          required
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black"
        >
          <option value="" disabled>
            Select…
          </option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.full_name} ({agent.phone_number})
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Assigning…' : 'Assign'}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
