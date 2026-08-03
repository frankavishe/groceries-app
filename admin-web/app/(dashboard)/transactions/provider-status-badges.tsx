import type { PaymentProvider, PaymentStatus } from '@/lib/types';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  INITIATED: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  SUCCESSFUL: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  MPESA: 'M-Pesa',
  MIXX_BY_YAS: 'Mixx by Yas',
  AIRTEL_MONEY: 'Airtel Money',
};

export function providerLabel(provider: PaymentProvider): string {
  return PROVIDER_LABELS[provider];
}
