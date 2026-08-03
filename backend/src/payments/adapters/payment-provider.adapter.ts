import { Order } from '../../orders/entities/order.entity';

// Raw inbound webhook data — deliberately untyped beyond this shape, since
// each provider's actual payload/signature scheme differs (constitution's
// adapter-isolation rule: quirks stay inside the adapter file, never leak
// into PaymentsService).
export interface RawCallbackRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface InitiateResult {
  checkoutRequestId: string;
  referenceId: string;
}

export interface ParsedCallback {
  referenceId: string;
  checkoutRequestId: string;
  status: 'SUCCESSFUL' | 'FAILED';
  raw: unknown;
}

// specs/payments/design.md's PaymentProviderAdapter — one implementation per
// provider under adapters/{mpesa,mixx-yas,airtel-money}/. PaymentsService only
// ever calls this interface, never branches on provider internals itself.
export interface PaymentProviderAdapter {
  initiate(order: Order, phoneNumber: string): Promise<InitiateResult>;
  verifyCallback(request: RawCallbackRequest): boolean;
  parseCallback(request: RawCallbackRequest): ParsedCallback;
}
