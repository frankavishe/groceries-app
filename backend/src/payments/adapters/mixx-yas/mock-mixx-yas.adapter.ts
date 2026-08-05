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

// Not a real secret — no Mixx by Yas (Tigo Pesa) sandbox credentials exist for
// this project either (specs/payments/design.md's Per-Provider Notes), so M9
// follows the same self-simulated pattern established by MockMpesaAdapter at
// M8. Deliberately a *different* verification mechanism from M-Pesa's
// (in-body field over a canonical string, not a full-JSON-body header
// signature) per that same design note's "do not assume they're identical"
// instruction — both live entirely inside this one file, per the
// constitution's adapter-isolation rule.
const MOCK_SHARED_SECRET = 'mock-mixx-yas-dev-secret-not-for-production';

const SIMULATED_SETTLEMENT_DELAY_MS = 4000;

// Shaped like a Tigo Pesa-style callback: the signature travels as a field in
// the JSON body itself, not a header, computed over the other fields joined
// canonically (excluding the signature field itself).
interface MixxYasCallbackBody {
  ReferenceID: string;
  TransactionID: string;
  TxnStatus: 'SUCCESS' | 'FAILED';
  Msisdn: string;
  Amount: number;
  Signature: string;
}

// Only the fields the signature actually covers — Msisdn rides along in the
// body unsigned, same as a real Tigo Pesa callback wouldn't necessarily sign
// every field either.
type SignedFields = Pick<
  MixxYasCallbackBody,
  'ReferenceID' | 'TransactionID' | 'TxnStatus' | 'Amount'
>;

function canonicalFields(fields: SignedFields): string {
  return `${fields.ReferenceID}|${fields.TransactionID}|${fields.TxnStatus}|${fields.Amount}`;
}

function sign(fields: SignedFields): string {
  return createHmac('sha256', MOCK_SHARED_SECRET)
    .update(canonicalFields(fields))
    .digest('hex');
}

@Injectable()
export class MockMixxYasAdapter implements PaymentProviderAdapter {
  private readonly logger = new Logger(MockMixxYasAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  initiate(order: Order, phoneNumber: string): Promise<InitiateResult> {
    const checkoutRequestId = `MIXX_TXN_${Date.now()}_${randomUUID()}`;
    const referenceId = randomUUID();

    this.scheduleSimulatedCallback(
      checkoutRequestId,
      referenceId,
      order,
      phoneNumber,
    );

    return Promise.resolve({ checkoutRequestId, referenceId });
  }

  verifyCallback(request: RawCallbackRequest): boolean {
    const body = request.body as Partial<MixxYasCallbackBody> | undefined;
    if (
      !body ||
      typeof body.Signature !== 'string' ||
      typeof body.ReferenceID !== 'string' ||
      typeof body.TransactionID !== 'string' ||
      typeof body.TxnStatus !== 'string' ||
      typeof body.Amount !== 'number'
    ) {
      return false;
    }

    const expected = sign({
      ReferenceID: body.ReferenceID,
      TransactionID: body.TransactionID,
      TxnStatus: body.TxnStatus,
      Amount: body.Amount,
    });
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(body.Signature);
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  }

  parseCallback(request: RawCallbackRequest): ParsedCallback {
    const body = request.body as MixxYasCallbackBody;
    return {
      referenceId: body.ReferenceID,
      checkoutRequestId: body.TransactionID,
      status: body.TxnStatus === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED',
      raw: body,
    };
  }

  private scheduleSimulatedCallback(
    checkoutRequestId: string,
    referenceId: string,
    order: Order,
    phoneNumber: string,
  ): void {
    const fields: Omit<MixxYasCallbackBody, 'Signature'> = {
      ReferenceID: referenceId,
      TransactionID: checkoutRequestId,
      TxnStatus: 'SUCCESS',
      Msisdn: phoneNumber,
      Amount: order.totalAmount,
    };
    const body: MixxYasCallbackBody = { ...fields, Signature: sign(fields) };
    const port = this.configService.get<number>('port');
    const url = `http://127.0.0.1:${port}/api/v1/payments/callback/mixx_yas`;

    const timer = setTimeout(() => {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err: unknown) => {
        this.logger.debug(
          `Simulated Mixx by Yas callback delivery failed (expected outside a running dev server): ${String(err)}`,
        );
      });
    }, SIMULATED_SETTLEMENT_DELAY_MS);
    timer.unref();
  }
}

// Exported so tests can construct a matching signed callback body without
// duplicating the (fake) signing scheme.
export function signMockMixxYasFields(
  fields: Omit<MixxYasCallbackBody, 'Signature'>,
): string {
  return sign(fields);
}
