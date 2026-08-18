'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/app/components/cart-provider';
import type { PaymentProvider } from '@/lib/types';
import { initiatePaymentAction } from '../provider/actions';
import { pollPaymentStatusAction } from './actions';

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 2 * 60 * 1000;

type UiState = 'waiting' | 'failed' | 'timedOut' | 'error';

// Req 18-22: direct port of mobile-app's payment_pending_screen.dart state
// machine — see specs/customer-web/design.md's Checkout → Payment section
// for the exact rules this must preserve (cart clears only on SUCCESSFUL,
// timedOut is explicitly not a failure, network errors don't end the wait
// early, "Try again" re-initiates for the same order).
export function PendingClient({
  orderId,
  provider,
  phoneNumber,
}: {
  orderId: string;
  provider: PaymentProvider;
  phoneNumber: string;
}) {
  const router = useRouter();
  const { clear } = useCart();
  const [uiState, setUiState] = useState<UiState>('waiting');
  const [error, setError] = useState<string | null>(null);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    elapsedRef.current += POLL_INTERVAL_MS;
    const result = await pollPaymentStatusAction(orderId);

    if (result.ok && result.transaction) {
      if (result.transaction.status === 'SUCCESSFUL') {
        stopPolling();
        clear();
        router.push(`/checkout/confirmation/${orderId}`);
        return;
      }
      if (result.transaction.status === 'FAILED') {
        stopPolling();
        setUiState('failed');
        return;
      }
      if (elapsedRef.current >= TIMEOUT_MS) {
        stopPolling();
        setUiState('timedOut');
      }
      return;
    }

    // Req 22: a network/API error on a single poll doesn't end the wait —
    // only surface it once the overall timeout is also reached.
    if (elapsedRef.current >= TIMEOUT_MS) {
      stopPolling();
      setUiState('error');
      setError(result.error ?? 'Something went wrong.');
    }
  }, [orderId, clear, router, stopPolling]);

  const startPolling = useCallback(() => {
    setUiState('waiting');
    setError(null);
    elapsedRef.current = 0;
    stopPolling();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [poll, stopPolling]);

  useEffect(() => {
    // Kicks off polling an external system (the payments status endpoint)
    // on mount — the carve-out this lint rule's "subscribe to updates from
    // an external system" case is meant for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  async function retry() {
    setUiState('waiting');
    setError(null);
    const result = await initiatePaymentAction(orderId, provider, phoneNumber);
    if (!result.ok) {
      setUiState('error');
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    startPolling();
  }

  function backToShopping() {
    router.push('/');
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-16 text-center">
      {uiState === 'waiting' && (
        <>
          <Spinner />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Waiting for payment confirmation on your phone...
          </p>
        </>
      )}
      {uiState === 'failed' && (
        <>
          <p className="text-4xl">⚠️</p>
          <p className="text-sm">
            Payment was not completed. Your order is still reserved — try again.
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Try again
          </button>
          <button type="button" onClick={backToShopping} className="text-sm underline">
            Back to shopping
          </button>
        </>
      )}
      {uiState === 'timedOut' && (
        <>
          <p className="text-4xl">⏳</p>
          <p className="text-sm">
            This is taking longer than expected. Your payment may still go through — check
            Order History shortly, or try again.
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Try again
          </button>
          <button type="button" onClick={backToShopping} className="text-sm underline">
            Back to shopping
          </button>
        </>
      )}
      {uiState === 'error' && (
        <>
          <p className="text-4xl">⚠️</p>
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? 'Something went wrong.'}
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white"
      role="status"
      aria-label="Loading"
    />
  );
}
