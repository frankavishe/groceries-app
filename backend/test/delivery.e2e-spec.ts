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

interface OrderResponseBody {
  id: string;
  user_id: string | null;
  assigned_agent_id: string | null;
  status: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
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

interface AgentResponseBody {
  id: string;
  full_name: string;
  phone_number: string;
}

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function uniquePhone(): string {
  return `+2557${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
}

describe('Delivery (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let customerToken: string;
  let agentToken: string;
  let agentId: string;
  let otherAgentToken: string;
  let otherAgentId: string;

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
    const usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    async function createUser(role: UserRole): Promise<User> {
      const passwordHash = await bcrypt.hash('Whatever123', 10);
      const user = usersRepository.create({
        fullName: 'Delivery E2E User',
        phoneNumber: uniquePhone(),
        passwordHash,
        role,
        isVerified: true,
      });
      return usersRepository.save(user);
    }

    const adminUser = await createUser(UserRole.ADMIN);
    const customerUser = await createUser(UserRole.CUSTOMER);
    const agentUser = await createUser(UserRole.DELIVERY_AGENT);
    const otherAgentUser = await createUser(UserRole.DELIVERY_AGENT);
    agentId = agentUser.id;
    otherAgentId = otherAgentUser.id;

    async function tokenFor(user: User): Promise<string> {
      return jwtService.signAsync({
        sub: user.id,
        role: user.role,
        phone_number: user.phoneNumber,
      });
    }

    adminToken = await tokenFor(adminUser);
    customerToken = await tokenFor(customerUser);
    agentToken = await tokenFor(agentUser);
    otherAgentToken = await tokenFor(otherAgentUser);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProduct(): Promise<ProductResponseBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueName('DeliveryTestProduct'),
        price: 1000,
        unit: 'pack',
        stock_quantity: 10,
      })
      .expect(201);
    return res.body as ProductResponseBody;
  }

  async function setStatus(
    orderId: string,
    status: string,
  ): Promise<OrderResponseBody> {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status })
      .expect(200);
    return res.body as OrderResponseBody;
  }

  async function createOrderAt(
    status: 'PROCESSING' | 'DISPATCHED',
  ): Promise<OrderResponseBody> {
    const product = await createProduct();
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    await setStatus(order.id, 'PAID');
    let current = await setStatus(order.id, 'PROCESSING');
    if (status === 'DISPATCHED') {
      current = await setStatus(order.id, 'DISPATCHED');
    }
    return current;
  }

  it('assigns a delivery agent to a PROCESSING order (Req 1)', async () => {
    const order = await createOrderAt('PROCESSING');

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);
    expect((res.body as OrderResponseBody).assigned_agent_id).toBe(agentId);
  });

  it('rejects assignment when the order is not PROCESSING/DISPATCHED (Req 2)', async () => {
    const product = await createProduct();
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    const order = created.body as OrderResponseBody;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(400);
    expect((res.body as ErrorResponseBody).error).toBe(
      'INVALID_ORDER_STATUS_FOR_ASSIGNMENT',
    );
  });

  it('rejects assignment when the target user is not a DELIVERY_AGENT (Req 3)', async () => {
    const order = await createOrderAt('PROCESSING');

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: order.user_id })
      .expect(400);
    expect((res.body as ErrorResponseBody).error).toBe(
      'INVALID_DELIVERY_AGENT',
    );
  });

  it('rejects assignment from a non-admin with 403', async () => {
    const order = await createOrderAt('PROCESSING');

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ agent_id: agentId })
      .expect(403);
  });

  it('lists only the agent’s own assigned orders, DISPATCHED first (Req 4)', async () => {
    const dispatched = await createOrderAt('DISPATCHED');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${dispatched.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    const processing = await createOrderAt('PROCESSING');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${processing.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    const otherOrder = await createOrderAt('DISPATCHED');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${otherOrder.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: otherAgentId })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/delivery/my-orders')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);
    const body = res.body as OrderResponseBody[];

    expect(body.some((o) => o.id === otherOrder.id)).toBe(false);
    const ids = body.map((o) => o.id);
    expect(ids).toContain(dispatched.id);
    expect(ids).toContain(processing.id);
    expect(ids.indexOf(dispatched.id)).toBeLessThan(ids.indexOf(processing.id));
  });

  it('rejects GET /delivery/my-orders for a non-agent with 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/delivery/my-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('lets an agent mark their own DISPATCHED order DELIVERED (Req 5)', async () => {
    const order = await createOrderAt('DISPATCHED');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'DELIVERED' })
      .expect(200);
    expect((res.body as OrderResponseBody).status).toBe('DELIVERED');
  });

  it('rejects an agent marking an order not assigned to them (Req 5-6)', async () => {
    const order = await createOrderAt('DISPATCHED');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${otherAgentToken}`)
      .send({ status: 'DELIVERED' })
      .expect(403);
  });

  it('rejects an agent setting any status other than DELIVERED (Req 6)', async () => {
    const order = await createOrderAt('DISPATCHED');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'CANCELLED' })
      .expect(403);
  });

  it('rejects an agent marking their own order DELIVERED before it is DISPATCHED (Req 5)', async () => {
    const order = await createOrderAt('PROCESSING');
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agent_id: agentId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'DELIVERED' })
      .expect(403);
  });

  it('lists active delivery agents for the admin assignment UI', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/delivery/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as AgentResponseBody[];
    expect(body.some((a) => a.id === agentId)).toBe(true);
  });

  it('rejects GET /delivery/agents for a non-admin with 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/delivery/agents')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(403);
  });
});
