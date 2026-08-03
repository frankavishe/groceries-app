import { PaymentTransaction } from './entities/payment-transaction.entity';

export interface PublicPaymentTransaction {
  id: string;
  order_id: string;
  provider: string;
  phone_number: string;
  amount: number;
  reference_id: string | null;
  checkout_request_id: string | null;
  status: string;
  created_at: Date;
}

export function toPublicPaymentTransaction(
  transaction: PaymentTransaction,
): PublicPaymentTransaction {
  return {
    id: transaction.id,
    order_id: transaction.orderId,
    provider: transaction.provider,
    phone_number: transaction.phoneNumber,
    amount: transaction.amount,
    reference_id: transaction.referenceId,
    checkout_request_id: transaction.checkoutRequestId,
    status: transaction.status,
    created_at: transaction.createdAt,
  };
}
