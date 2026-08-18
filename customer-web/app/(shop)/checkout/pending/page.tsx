import type { PaymentProvider } from '@/lib/types';
import { PendingClient } from './pending-client';

interface PendingPageProps {
  searchParams: Promise<{ order_id?: string; provider?: string; phone?: string }>;
}

export default async function PendingPage({ searchParams }: PendingPageProps) {
  const { order_id: orderId, provider, phone } = await searchParams;
  if (!orderId || !provider || !phone) {
    return <p className="text-sm text-red-600 dark:text-red-400">Missing payment details.</p>;
  }

  return (
    <PendingClient orderId={orderId} provider={provider as PaymentProvider} phoneNumber={phone} />
  );
}
