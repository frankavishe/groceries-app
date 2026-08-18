'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm({ verified }: { verified: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {verified && (
        <p className="rounded bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-500/15 dark:text-green-300">
          Phone number verified. You can now log in.
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Phone number
        <input
          name="phone_number"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+255700000000"
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
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
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        New here?{' '}
        <Link href="/register" className="underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
