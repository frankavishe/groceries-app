import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../../orders/entities/order.entity';
import {
  InitiateResult,
  ParsedCallback,
  PaymentProviderAdapter,
  RawCallbackRequest,
} from '../payment-provider.adapter';

const SIGNATURE_HEADER = 'x-mock-mpesa-signature';

// Not a real secret — this adapter has no live Safaricom Daraja credentials
// (specs/payments/design.md flags M-Pesa's real verification mechanism as
// still TBD). It invents its own symmetric signing scheme purely so
// verifyCallback has something genuine to check, both ends of which live in
// this one file per the constitution's adapter-isolation rule. Swap this
// whole adapter for a real Daraja-backed one (STK push + Safaricom's actual
// signature scheme) once sandbox credentials exist — nothing outside this
// file needs to change.
const MOCK_SHARED_SECRET = 'mock-mpesa-dev-secret-not-for-production';

const SIMULATED_SETTLEMENT_DELAY_MS = 4000;

interface MpesaCallbackMetadataItem {
  Name: string;
  Value: string | number;
}

// Shaped like Safaricom's real Lipa na M-Pesa Online (STK Push) callback, so
// parseCallback exercises a realistic structure even though the transport
// (a self-POST from this adapter, not Safaricom) is fake.
interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: MpesaCallbackMetadataItem[] };
    };
  };
}

function sign(payload: string): string {
  return createHmac('sha256', MOCK_SHARED_SECRET).update(payload).digest('hex');
}

@Injectable()
export class MockMpesaAdapter implements PaymentProviderAdapter {
  private readonly logger = new Logger(MockMpesaAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  // Not `async` — the interface returns a Promise because a real adapter
  // would await an HTTP call to the provider; this mock has nothing to await
  // (the simulated settlement below is deliberately fire-and-forget). Omits
  // the interface's `phoneNumber` parameter entirely since this mock never
  // uses it (a real adapter would pass it on to the STK push request).
  initiate(order: Order): Promise<InitiateResult> {
    const checkoutRequestId = `ws_CO_${Date.now()}_${randomUUID()}`;
    const referenceId = randomUUID();

    // Real Safaricom would call our public callback URL asynchronously,
    // independent of this request. Nothing does that here, so this adapter
    // simulates it with a delayed self-POST to our own callback endpoint —
    // exercising the exact same verify/parse/idempotency path a real webhook
    // would hit. Deliberately not awaited: STK push itself returns
    // immediately in the real flow too, before the customer has even entered
    // their PIN.
    this.scheduleSimulatedCallback(checkoutRequestId, referenceId, order);

    return Promise.resolve({ checkoutRequestId, referenceId });
  }

  verifyCallback(request: RawCallbackRequest): boolean {
    const signature = request.headers[SIGNATURE_HEADER];
    if (typeof signature !== 'string') return false;

    const expected = sign(JSON.stringify(request.body));
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  }

  parseCallback(request: RawCallbackRequest): ParsedCallback {
    const body = request.body as MpesaCallbackBody;
    const callback = body.Body.stkCallback;
    return {
      referenceId: callback.MerchantRequestID,
      checkoutRequestId: callback.CheckoutRequestID,
      status: callback.ResultCode === 0 ? 'SUCCESSFUL' : 'FAILED',
      raw: body,
    };
  }

  private scheduleSimulatedCallback(
    checkoutRequestId: string,
    referenceId: string,
    order: Order,
  ): void {
    const body: MpesaCallbackBody = {
      Body: {
        stkCallback: {
          MerchantRequestID: referenceId,
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: order.totalAmount },
              {
                Name: 'MpesaReceiptNumber',
                Value: randomUUID().slice(0, 10).toUpperCase(),
              },
            ],
          },
        },
      },
    };
    const payload = JSON.stringify(body);
    const port = this.configService.get<number>('port');
    const url = `http://127.0.0.1:${port}/api/v1/payments/callback/mpesa`;

    // .unref() so this timer never keeps the process (or a test worker) alive
    // on its own — it's best-effort simulated delivery, not real work.
    const timer = setTimeout(() => {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [SIGNATURE_HEADER]: sign(payload),
        },
        body: payload,
      }).catch((err: unknown) => {
        // Expected in automated tests (no real HTTP listener is bound) — e2e
        // coverage for the callback endpoint posts a synthetic signed
        // callback directly instead of waiting on this timer.
        this.logger.debug(
          `Simulated M-Pesa callback delivery failed (expected outside a running dev server): ${String(err)}`,
        );
      });
    }, SIMULATED_SETTLEMENT_DELAY_MS);
    timer.unref();
  }
}

// Exported so tests can construct a matching signed callback body without
// duplicating the (fake) signing scheme.
export function signMockMpesaPayload(payload: string): string {
  return sign(payload);
}
