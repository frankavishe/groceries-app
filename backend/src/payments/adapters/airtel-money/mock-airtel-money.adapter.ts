import { randomUUID, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../../orders/entities/order.entity';
import {
  InitiateResult,
  ParsedCallback,
  PaymentProviderAdapter,
  RawCallbackRequest,
} from '../payment-provider.adapter';

// Not a real secret — no Airtel Money sandbox credentials exist for this
// project either (specs/payments/design.md's Per-Provider Notes), so M9
// follows the same self-simulated pattern established by MockMpesaAdapter at
// M8. Deliberately a *third*, distinct verification mechanism (a static
// pre-shared API-key header, not an HMAC signature at all) per that same
// design note's "do not assume they're identical" instruction — matches the
// "shared secret" option specs/payments/requirements.md Req 5 explicitly
// allows alongside signature headers. Swapping in a real Airtel Money adapter
// (their actual OAuth/webhook-auth scheme) later only touches this file.
const SIGNATURE_HEADER = 'x-airtel-money-api-key';
const MOCK_SHARED_SECRET = 'mock-airtel-money-dev-secret-not-for-production';

const SIMULATED_SETTLEMENT_DELAY_MS = 4000;

// Shaped like Airtel Money's real disbursement/collection callback, which
// nests the outcome under a `transaction` object and reports status via a
// short code (`TS` = Transaction Success, `TF` = Transaction Failed).
interface AirtelMoneyCallbackBody {
  transaction: {
    id: string;
    airtel_money_id: string;
    status_code: 'TS' | 'TF';
    message: string;
    amount: number;
  };
}

@Injectable()
export class MockAirtelMoneyAdapter implements PaymentProviderAdapter {
  private readonly logger = new Logger(MockAirtelMoneyAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  initiate(order: Order): Promise<InitiateResult> {
    const checkoutRequestId = `AM_${randomUUID()}`;
    const referenceId = randomUUID();

    this.scheduleSimulatedCallback(checkoutRequestId, referenceId, order);

    return Promise.resolve({ checkoutRequestId, referenceId });
  }

  verifyCallback(request: RawCallbackRequest): boolean {
    const key = request.headers[SIGNATURE_HEADER];
    if (typeof key !== 'string') return false;

    const expectedBuf = Buffer.from(MOCK_SHARED_SECRET);
    const actualBuf = Buffer.from(key);
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  }

  parseCallback(request: RawCallbackRequest): ParsedCallback {
    const body = request.body as AirtelMoneyCallbackBody;
    return {
      referenceId: body.transaction.id,
      checkoutRequestId: body.transaction.airtel_money_id,
      status: body.transaction.status_code === 'TS' ? 'SUCCESSFUL' : 'FAILED',
      raw: body,
    };
  }

  private scheduleSimulatedCallback(
    checkoutRequestId: string,
    referenceId: string,
    order: Order,
  ): void {
    const body: AirtelMoneyCallbackBody = {
      transaction: {
        id: referenceId,
        airtel_money_id: checkoutRequestId,
        status_code: 'TS',
        message: 'Transaction successful',
        amount: order.totalAmount,
      },
    };
    const port = this.configService.get<number>('port');
    const url = `http://127.0.0.1:${port}/api/v1/payments/callback/airtel_money`;

    const timer = setTimeout(() => {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [SIGNATURE_HEADER]: MOCK_SHARED_SECRET,
        },
        body: JSON.stringify(body),
      }).catch((err: unknown) => {
        this.logger.debug(
          `Simulated Airtel Money callback delivery failed (expected outside a running dev server): ${String(err)}`,
        );
      });
    }, SIMULATED_SETTLEMENT_DELAY_MS);
    timer.unref();
  }
}

// Exported so tests can send a validly "signed" callback without duplicating
// the (fake) shared-secret constant.
export function mockAirtelMoneyApiKey(): string {
  return MOCK_SHARED_SECRET;
}

export const AIRTEL_MONEY_SIGNATURE_HEADER = SIGNATURE_HEADER;
