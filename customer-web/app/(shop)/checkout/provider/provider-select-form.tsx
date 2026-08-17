'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PaymentProvider } from '@/lib/types';
import { initiatePaymentAction } from './actions';

// Req 17: display labels mirror mobile's payment_provider_select_screen.dart.
const PROVIDERS: { value: PaymentProvider; label: string }[] = [
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'MIXX_BY_YAS', label: 'Mixx by Yas' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
];

export function ProviderSelectForm({
  orderId,
  defaultPhone,
}: {
  orderId: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<PaymentProvider>('MPESA');
  const [phone, setPhone] = useState(defaultPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!phone.trim()) {
      setError('Enter the phone number to receive the USSD prompt.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await initiatePaymentAction(orderId, provider, phone.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not initiate payment. Please try again.');
      return;
    }
    const params = new URLSearchParams({
      order_id: orderId,
      provider,
      phone: phone.trim(),
    });
    router.push(`/checkout/pending?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">Choose a mobile money provider</legend>
        {PROVIDERS.map((p) => (
          <label key={p.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="provider"
              value={p.value}
              checked={provider === p.value}
              onChange={() => setProvider(p.value)}
            />
            {p.label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Phone number to receive the USSD prompt
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:focus:border-white"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={pay}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitting ? 'Paying…' : 'Pay'}
      </button>
    </div>
  );
}
