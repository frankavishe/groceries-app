import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/users/entities/user.entity';

interface OrderItemResponseBody {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderResponseBody {
  id: string;
  user_id: string | null;
  status: string;
  total_amount: number;
  delivery_fee: number;
  items: OrderItemResponseBody[];
  created_at: string;
}

interface PaginatedOrdersBody {
  data: OrderResponseBody[];
  total: number;
  page: number;
  pageSize: number;
}

interface ErrorResponseBody {
  statusCode: number;
  error?: string;
  message: string | string[];
  details?: unknown;
}

interface ProductResponseBody {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function uniquePhone(): string {
  return `+2557${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
}

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let otherCustomerToken: string;

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

    const jwtService = moduleFixture.get(JwtService);
    // orders.user_id is a real FK to users(id) — arbitrary string subs (fine
    // for products/categories, which have no user FK) would fail with a
    // Postgres FK/type error here, so each token needs a real users row.
    const usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    async function createUser(role: UserRole): Promise<User> {
      const passwordHash = await bcrypt.hash('Whatever123', 10);
      const user = usersRepository.create({
        fullName: 'Orders E2E User',
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
    customerId = customerUser.id;

    adminToken = await jwtService.signAsync({
      sub: adminUser.id,
      role: adminUser.role,
      phone_number: adminUser.phoneNumber,
    });
    customerToken = await jwtService.signAsync({
      sub: customerUser.id,
      role: customerUser.role,
      phone_number: customerUser.phoneNumber,
    });
    otherCustomerToken = await jwtService.signAsync({
      sub: otherCustomerUser.id,
      role: otherCustomerUser.role,
      phone_number: otherCustomerUser.phoneNumber,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProduct(
    overrides: Record<string, unknown> = {},
  ): Promise<ProductResponseBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueName('OrderTestProduct'),
        price: 1000,
        unit: 'pack',
        stock_quantity: 10,
        ...overrides,
      })
      .expect(201);
    return res.body as ProductResponseBody;
  }

  async function currentStock(productId: string): Promise<number> {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products/low-stock')
      .query({ threshold: 100000 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as ProductResponseBody[];
    const match = body.find((p) => p.id === productId);
    if (!match) throw new Error(`product ${productId} not found`);
    return match.stock_quantity;
  }

  it('creates an order, decrements stock, and computes total_amount (Req 1, 4)', async () => {
    const product = await createProduct({ price: 1500, stock_quantity: 10 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 3 }] })
      .expect(201);
    const body = res.body as OrderResponseBody;

    expect(body.status).toBe('PENDING');
    expect(body.items).toHaveLength(1);
    expect(body.items[0].subtotal).toBe(4500);
    expect(body.total_amount).toBe(4500 + body.delivery_fee);
    expect(await currentStock(product.id)).toBe(7);
  });

  it('sums duplicate product_id lines before checking stock (Req 1)', async () => {
    const product = await createProduct({ stock_quantity: 5 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { product_id: product.id, quantity: 2 },
          { product_id: product.id, quantity: 3 },
        ],
      })
      .expect(201);
    const body = res.body as OrderResponseBody;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].quantity).toBe(5);
    expect(await currentStock(product.id)).toBe(0);
  });

  it('rejects an order exceeding stock with 409, no partial decrement (Req 2)', async () => {
    const product = await createProduct({ stock_quantity: 2 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 5 }] })
      .expect(409);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('INSUFFICIENT_STOCK');
    expect(await currentStock(product.id)).toBe(2);
  });

  it('rejects a non-customer (admin) placing an order with 403', async () => {
    const product = await createProduct();
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(403);
  });

  it('lists only the caller-own orders for a customer, all orders for admin (Req 6)', async () => {
    const product = await createProduct();
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    const ownList = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .query({ pageSize: 100 })
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const ownBody = ownList.body as PaginatedOrdersBody;
    expect(ownBody.data.every((o) => o.user_id === customerId)).toBe(true);
    expect(ownBody.data.some((o) => o.id === order.id)).toBe(true);

    const otherList = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .query({ pageSize: 100 })
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(200);
    const otherBody = otherList.body as PaginatedOrdersBody;
    expect(otherBody.data.some((o) => o.id === order.id)).toBe(false);

    const adminList = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .query({ pageSize: 100 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const adminBody = adminList.body as PaginatedOrdersBody;
    expect(adminBody.data.some((o) => o.id === order.id)).toBe(true);
  });

  it("returns 404 for another customer's order, 200 for the owner and admin (Req 7)", async () => {
    const product = await createProduct();
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);
  });

  it('enforces the forward-only status transition table, rejecting a skip with 400 (Req 8, 9)', async () => {
    const product = await createProduct();
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    const skip = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROCESSING' })
      .expect(400);
    expect((skip.body as ErrorResponseBody).error).toBe(
      'INVALID_STATUS_TRANSITION',
    );

    const paid = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200);
    expect((paid.body as OrderResponseBody).status).toBe('PAID');

    const backward = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PENDING' })
      .expect(400);
    expect((backward.body as ErrorResponseBody).error).toBe(
      'INVALID_STATUS_TRANSITION',
    );
  });

  it('rejects a non-admin status update with 403', async () => {
    const product = await createProduct();
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'PAID' })
      .expect(403);
  });

  it('restores stock when a PENDING order is cancelled (Req 10)', async () => {
    const product = await createProduct({ stock_quantity: 5 });
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 3 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;
    expect(await currentStock(product.id)).toBe(2);

    const cancelled = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);
    expect((cancelled.body as OrderResponseBody).status).toBe('CANCELLED');
    expect(await currentStock(product.id)).toBe(5);
  });

  it('does not restore stock when cancelling from PROCESSING (Req 10)', async () => {
    const product = await createProduct({ stock_quantity: 5 });
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 3 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200);
    expect(await currentStock(product.id)).toBe(2);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);
    expect(await currentStock(product.id)).toBe(2);
  });

  // Req 3 / PLAN.md M4 verification: N parallel checkouts against stock
  // deliberately below N must never oversell — exactly stock_quantity
  // succeed, the rest 409, and final stock_quantity is exactly 0.
  it('never oversells under parallel load (Req 3)', async () => {
    const STOCK = 5;
    const PARALLEL_REQUESTS = 20;
    const product = await createProduct({ stock_quantity: STOCK });

    const results = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, () =>
        request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ items: [{ product_id: product.id, quantity: 1 }] }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);

    expect(succeeded).toHaveLength(STOCK);
    expect(rejected).toHaveLength(PARALLEL_REQUESTS - STOCK);
    expect(
      rejected.every(
        (r) => (r.body as ErrorResponseBody).error === 'INSUFFICIENT_STOCK',
      ),
    ).toBe(true);
    expect(await currentStock(product.id)).toBe(0);
  });
});
