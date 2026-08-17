'use client';

import { useActionState } from 'react';
import { verifyOtpAction, type VerifyOtpState } from './actions';

const initialState: VerifyOtpState = {};

export function VerifyOtpForm({ phone }: { phone: string }) {
  const [state, formAction, pending] = useActionState(verifyOtpAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="phone_number" value={phone} />
      <label className="flex flex-col gap-1 text-sm">
        6-digit code
        <input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          className="rounded border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  );
}
