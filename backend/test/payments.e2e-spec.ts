import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  AIRTEL_MONEY_SIGNATURE_HEADER,
  mockAirtelMoneyApiKey,
} from '../src/payments/adapters/airtel-money/mock-airtel-money.adapter';
import { signMockMixxYasFields } from '../src/payments/adapters/mixx-yas/mock-mixx-yas.adapter';
import { signMockMpesaPayload } from '../src/payments/adapters/mpesa/mock-mpesa.adapter';
import { PaymentTransaction } from '../src/payments/entities/payment-transaction.entity';
import { User, UserRole } from '../src/users/entities/user.entity';

interface OrderResponseBody {
  id: string;
  status: string;
  total_amount: number;
}

interface ProductResponseBody {
  id: string;
  price: number;
  stock_quantity: number;
}

interface TransactionResponseBody {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  reference_id: string | null;
  checkout_request_id: string | null;
}

interface ErrorResponseBody {
  statusCode: number;
  error?: string;
  message: string | string[];
}

interface PaginatedTransactionsBody {
  data: TransactionResponseBody[];
  total: number;
}

interface SummaryRow {
  provider: string;
  count: number;
  total_amount: number;
}

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function uniquePhone(): string {
  return `+2557${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
}

function mpesaCallbackBody(
  referenceId: string,
  checkoutRequestId: string,
  resultCode: number,
) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: referenceId,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc:
          resultCode === 0 ? 'Success' : 'The balance is insufficient.',
      },
    },
  };
}

function mixxYasCallbackFields(
  referenceId: string,
  checkoutRequestId: string,
  status: 'SUCCESS' | 'FAILED',
  amount: number,
) {
  return {
    ReferenceID: referenceId,
    TransactionID: checkoutRequestId,
    TxnStatus: status,
    Msisdn: '+255700000099',
    Amount: amount,
  };
}

function airtelMoneyCallbackBody(
  referenceId: string,
  checkoutRequestId: string,
  statusCode: 'TS' | 'TF',
  amount: number,
) {
  return {
    transaction: {
      id: referenceId,
      airtel_money_id: checkoutRequestId,
      status_code: statusCode,
      message: statusCode === 'TS' ? 'Success' : 'Failed',
      amount,
    },
  };
}

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let customerToken: string;
  let otherCustomerToken: string;
  let transactionsRepository: Repository<PaymentTransaction>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    transactionsRepository = moduleFixture.get<Repository<PaymentTransaction>>(
      getRepositoryToken(PaymentTransaction),
    );

    const jwtService = moduleFixture.get(JwtService);
    const usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    async function createUser(role: UserRole): Promise<User> {
      const passwordHash = await bcrypt.hash('Whatever123', 10);
      const user = usersRepository.create({
        fullName: 'Payments E2E User',
        phoneNumber: uniquePhone(),
        passwordHash,
        role,
        isVerified: true,
      });
      return usersRepository.save(user);
    }

    const adminUser = await createUser(UserRole.ADMIN);
    const customerUser = await createUser(UserRole.CUSTOMER);
    const otherCustomerUser = await createUser(UserRole.CUSTOMER);

    async function tokenFor(user: User): Promise<string> {
      return jwtService.signAsync({
        sub: user.id,
        role: user.role,
        phone_number: user.phoneNumber,
      });
    }

    adminToken = await tokenFor(adminUser);
    customerToken = await tokenFor(customerUser);
    otherCustomerToken = await tokenFor(otherCustomerUser);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProduct(): Promise<ProductResponseBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueName('PaymentsTestProduct'),
        price: 1000,
        unit: 'pack',
        stock_quantity: 10,
      })
      .expect(201);
    return res.body as ProductResponseBody;
  }

  async function createPendingOrder(
    token = customerToken,
  ): Promise<OrderResponseBody> {
    const product = await createProduct();
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    return res.body as OrderResponseBody;
  }

  async function initiateWithProvider(
    orderId: string,
    provider: string,
    token = customerToken,
  ): Promise<TransactionResponseBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        order_id: orderId,
        provider,
        phone_number: '+255700000099',
      })
      .expect(201);
    return res.body as TransactionResponseBody;
  }

  async function initiate(
    orderId: string,
    token = customerToken,
  ): Promise<TransactionResponseBody> {
    return initiateWithProvider(orderId, 'MPESA', token);
  }

  async function sendCallback(
    body: object,
    signature: string,
    expectStatus = 200,
  ) {
    const payload = JSON.stringify(body);
    return request(app.getHttpServer())
      .post('/api/v1/payments/callback/mpesa')
      .set('Content-Type', 'application/json')
      .set('x-mock-mpesa-signature', signature)
      .send(payload)
      .expect(expectStatus);
  }

  it('initiates a payment for a PENDING order (Req 1)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiate(order.id);
    expect(transaction.order_id).toBe(order.id);
    expect(transaction.provider).toBe('MPESA');
    expect(transaction.status).toBe('INITIATED');
    expect(transaction.checkout_request_id).toBeTruthy();
    expect(transaction.reference_id).toBeTruthy();
  });

  it('rejects initiate for an order that is not PENDING (Req 2)', async () => {
    const order = await createPendingOrder();
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        order_id: order.id,
        provider: 'MPESA',
        phone_number: '+255700000099',
      })
      .expect(400);
    expect((res.body as ErrorResponseBody).error).toBe('INVALID_ORDER_STATUS');
  });

  it('rejects a client-supplied amount rather than trusting it (Req 3)', async () => {
    const order = await createPendingOrder();
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        order_id: order.id,
        provider: 'MPESA',
        phone_number: '+255700000099',
        amount: 1,
      })
      .expect(400);
    expect((res.body as ErrorResponseBody).message).toBeDefined();
  });

  it("rejects initiating payment for another customer's order with 404", async () => {
    const order = await createPendingOrder();
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({
        order_id: order.id,
        provider: 'MPESA',
        phone_number: '+255700000099',
      })
      .expect(404);
  });

  it('initiates a payment via Mixx by Yas and cascades a successful callback (M9)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiateWithProvider(order.id, 'MIXX_BY_YAS');
    expect(transaction.provider).toBe('MIXX_BY_YAS');
    expect(transaction.checkout_request_id).toBeTruthy();
    expect(transaction.reference_id).toBeTruthy();

    const fields = mixxYasCallbackFields(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      'SUCCESS',
      order.total_amount,
    );
    await request(app.getHttpServer())
      .post('/api/v1/payments/callback/mixx_yas')
      .send({ ...fields, Signature: signMockMixxYasFields(fields) })
      .expect(200);

    const updated = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(updated!.status).toBe('SUCCESSFUL');

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((orderRes.body as OrderResponseBody).status).toBe('PAID');
  });

  it('rejects a Mixx by Yas callback with an invalid signature and writes nothing (M9)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiateWithProvider(order.id, 'MIXX_BY_YAS');
    const fields = mixxYasCallbackFields(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      'SUCCESS',
      order.total_amount,
    );

    await request(app.getHttpServer())
      .post('/api/v1/payments/callback/mixx_yas')
      .send({ ...fields, Signature: 'not-a-real-signature' })
      .expect(401);

    const unchanged = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(unchanged!.status).toBe('INITIATED');
  });

  it('initiates a payment via Airtel Money and cascades a successful callback (M9)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiateWithProvider(order.id, 'AIRTEL_MONEY');
    expect(transaction.provider).toBe('AIRTEL_MONEY');
    expect(transaction.checkout_request_id).toBeTruthy();
    expect(transaction.reference_id).toBeTruthy();

    const body = airtelMoneyCallbackBody(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      'TS',
      order.total_amount,
    );
    await request(app.getHttpServer())
      .post('/api/v1/payments/callback/airtel_money')
      .set(AIRTEL_MONEY_SIGNATURE_HEADER, mockAirtelMoneyApiKey())
      .send(body)
      .expect(200);

    const updated = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(updated!.status).toBe('SUCCESSFUL');

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((orderRes.body as OrderResponseBody).status).toBe('PAID');
  });

  it('rejects an Airtel Money callback with the wrong API key and writes nothing (M9)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiateWithProvider(order.id, 'AIRTEL_MONEY');
    const body = airtelMoneyCallbackBody(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      'TS',
      order.total_amount,
    );

    await request(app.getHttpServer())
      .post('/api/v1/payments/callback/airtel_money')
      .set(AIRTEL_MONEY_SIGNATURE_HEADER, 'not-the-real-key')
      .send(body)
      .expect(401);

    const unchanged = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(unchanged!.status).toBe('INITIATED');
  });

  it('creates a new transaction row per retry rather than reusing the failed one (Req 4)', async () => {
    const order = await createPendingOrder();
    const first = await initiate(order.id);
    const second = await initiate(order.id);
    expect(second.id).not.toBe(first.id);

    const count = await transactionsRepository.count({
      where: { orderId: order.id },
    });
    expect(count).toBe(2);
  });

  it('rejects a callback with an invalid signature and writes nothing (Req 5-6)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiate(order.id);
    const body = mpesaCallbackBody(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      0,
    );

    await request(app.getHttpServer())
      .post('/api/v1/payments/callback/mpesa')
      .set('Content-Type', 'application/json')
      .set('x-mock-mpesa-signature', 'not-a-real-signature')
      .send(JSON.stringify(body))
      .expect(401);

    const unchanged = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(unchanged!.status).toBe('INITIATED');
  });

  it('cascades a successful callback to the transaction and order (Req 7, 10)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiate(order.id);
    const body = mpesaCallbackBody(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      0,
    );
    await sendCallback(body, signMockMpesaPayload(JSON.stringify(body)));

    const updated = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(updated!.status).toBe('SUCCESSFUL');
    expect(updated!.responsePayload).toBeTruthy();

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((orderRes.body as OrderResponseBody).status).toBe('PAID');
  });

  it('marks a failed callback FAILED and leaves the order PENDING (Req 8)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiate(order.id);
    const body = mpesaCallbackBody(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      1,
    );
    await sendCallback(body, signMockMpesaPayload(JSON.stringify(body)));

    const updated = await transactionsRepository.findOneBy({
      id: transaction.id,
    });
    expect(updated!.status).toBe('FAILED');

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((orderRes.body as OrderResponseBody).status).toBe('PENDING');
  });

  it('processes a duplicate callback delivery idempotently (Req 9)', async () => {
    const order = await createPendingOrder();
    const transaction = await initiate(order.id);
    const body = mpesaCallbackBody(
      transaction.reference_id!,
      transaction.checkout_request_id!,
      0,
    );
    const signature = signMockMpesaPayload(JSON.stringify(body));

    await sendCallback(body, signature);
    await sendCallback(body, signature);

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((orderRes.body as OrderResponseBody).status).toBe('PAID');
  });

  it('404s a callback for an unknown provider', async () => {
    const body = mpesaCallbackBody('x', 'y', 0);
    await request(app.getHttpServer())
      .post('/api/v1/payments/callback/unknown-provider')
      .set('Content-Type', 'application/json')
      .set('x-mock-mpesa-signature', signMockMpesaPayload(JSON.stringify(body)))
      .send(JSON.stringify(body))
      .expect(404);
  });

  it("returns the most recent attempt's status, 404 before any attempt exists (Req 11)", async () => {
    const order = await createPendingOrder();
    await request(app.getHttpServer())
      .get(`/api/v1/payments/${order.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(404);

    await initiate(order.id);
    const second = await initiate(order.id);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/payments/${order.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect((res.body as TransactionResponseBody).id).toBe(second.id);
  });

  it("rejects a non-owner reading another customer's payment status with 404", async () => {
    const order = await createPendingOrder();
    await initiate(order.id);

    await request(app.getHttpServer())
      .get(`/api/v1/payments/${order.id}/status`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);
  });

  it('lists transactions filterable by provider/status for admin (Req 12)', async () => {
    const order = await createPendingOrder();
    await initiate(order.id);

    const res = await request(app.getHttpServer())
      .get('/api/v1/payments/transactions')
      .query({ provider: 'MPESA', status: 'INITIATED', pageSize: 100 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as PaginatedTransactionsBody;
    expect(
      body.data.every(
        (t) => t.provider === 'MPESA' && t.status === 'INITIATED',
      ),
    ).toBe(true);
    expect(body.data.some((t) => t.order_id === order.id)).toBe(true);
  });

  it('rejects a non-admin listing transactions with 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/payments/transactions')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('returns a per-provider summary for admin (Req 13)', async () => {
    const order = await createPendingOrder();
    await initiate(order.id);

    const res = await request(app.getHttpServer())
      .get('/api/v1/payments/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as SummaryRow[];
    const mpesaRow = body.find((row) => row.provider === 'MPESA');
    expect(mpesaRow).toBeDefined();
    expect(mpesaRow!.count).toBeGreaterThan(0);
  });

  it('rejects a non-admin reading the summary with 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/payments/summary')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });
});
