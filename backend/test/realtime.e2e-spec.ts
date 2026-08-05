import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/users/entities/user.entity';

// Real socket.io connections need more headroom than a plain HTTP round trip.
jest.setTimeout(15000);

interface OrderResponseBody {
  id: string;
  status: string;
}

interface ProductResponseBody {
  id: string;
}

interface OrderStatusChangedEvent {
  order_id: string;
  status: string;
}

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function uniquePhone(): string {
  return `+2557${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
}

function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// A rejected handshake (Req 2) can surface either as a `connect_error` or, if
// the server accepts the engine.io connection before disconnecting the
// socket.io client, as a `disconnect` — the gateway calls `client.disconnect`
// either way, so both count as "the connection was rejected".
function waitForRejection(socket: Socket, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error('Timed out waiting for the connection to be rejected'),
        ),
      timeoutMs,
    );
    socket.once('connect_error', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('disconnect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

describe('Realtime (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let adminToken: string;
  let customerToken: string;
  let sockets: Socket[] = [];

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
    // Unlike the other e2e specs, this one needs a real listening port —
    // socket.io-client opens an actual TCP connection, which supertest's
    // ephemeral per-request server (used by every other spec here) can't
    // serve.
    const server = (await app.listen(0)) as { address(): AddressInfo };
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;

    const jwtService = moduleFixture.get(JwtService);
    const usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    async function createUser(role: UserRole): Promise<User> {
      const passwordHash = await bcrypt.hash('Whatever123', 10);
      const user = usersRepository.create({
        fullName: 'Realtime E2E User',
        phoneNumber: uniquePhone(),
        passwordHash,
        role,
        isVerified: true,
      });
      return usersRepository.save(user);
    }

    const adminUser = await createUser(UserRole.ADMIN);
    const customerUser = await createUser(UserRole.CUSTOMER);

    async function tokenFor(user: User): Promise<string> {
      return jwtService.signAsync({
        sub: user.id,
        role: user.role,
        phone_number: user.phoneNumber,
      });
    }

    adminToken = await tokenFor(adminUser);
    customerToken = await tokenFor(customerUser);
  });

  afterEach(() => {
    for (const socket of sockets) {
      socket.disconnect();
    }
    sockets = [];
  });

  afterAll(async () => {
    await app.close();
  });

  function connect(token?: string): Socket {
    const socket = io(`${baseUrl}/ws/orders`, {
      transports: ['websocket'],
      reconnection: false,
      auth: token ? { token } : undefined,
    });
    sockets.push(socket);
    return socket;
  }

  async function createOrder(): Promise<OrderResponseBody> {
    const productRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueName('RealtimeTestProduct'),
        price: 1000,
        unit: 'pack',
        stock_quantity: 10,
      })
      .expect(201);
    const product = productRes.body as ProductResponseBody;

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: product.id, quantity: 1 }] })
      .expect(201);
    return orderRes.body as OrderResponseBody;
  }

  it('rejects a connection with no token (Req 2)', async () => {
    const socket = connect();
    await waitForRejection(socket);
  });

  it('rejects a connection with an invalid token (Req 2)', async () => {
    const socket = connect('not-a-real-jwt');
    await waitForRejection(socket);
  });

  it('broadcasts a status change to a connected admin session (Req 1-2)', async () => {
    const order = await createOrder();

    const socket = connect(adminToken);
    await waitForEvent(socket, 'connect');
    const eventPromise = waitForEvent<OrderStatusChangedEvent>(
      socket,
      'order:status-changed',
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200);

    const event = await eventPromise;
    expect(event.order_id).toBe(order.id);
    expect(event.status).toBe('PAID');
  });

  it('authenticates a non-admin session but never delivers admin broadcasts to it', async () => {
    const order = await createOrder();

    const socket = connect(customerToken);
    await waitForEvent(socket, 'connect');

    let received = false;
    socket.once('order:status-changed', () => {
      received = true;
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200);

    // Give the (non-)broadcast a moment to arrive before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(received).toBe(false);
  });
});
