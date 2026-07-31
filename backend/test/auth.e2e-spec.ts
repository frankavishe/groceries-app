import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import type Redis from 'ioredis';
import { AppModule } from '../src/app.module';
import { REDIS_CLIENT } from '../src/redis/redis.module';

interface RegisterResponseBody {
  id: string;
  full_name: string;
  phone_number: string;
  message: string;
}

interface LoginResponseBody {
  access_token: string;
  token_type: string;
  user: { id: string; full_name: string; phone_number: string; role: string };
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

function uniquePhone(): string {
  return `+2557${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let redis: Redis;

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

    redis = moduleFixture.get<Redis>(REDIS_CLIENT);
  });

  afterAll(async () => {
    await app.close();
  });

  async function readOtp(phoneNumber: string): Promise<string> {
    const stored = await redis.hgetall(`otp:${phoneNumber}`);
    if (!stored.code) {
      throw new Error(`No OTP stored for ${phoneNumber}`);
    }
    return stored.code;
  }

  it('registers, verifies OTP, and logs in (Req 1, 3, 4, 6, 8)', async () => {
    const phone = uniquePhone();

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        full_name: 'E2E User',
        phone_number: phone,
        password: 'SuperSecret1',
      })
      .expect(201);
    const registerBody = registerRes.body as RegisterResponseBody;
    expect(registerBody.phone_number).toBe(phone);

    const code = await readOtp(phone);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone_number: phone, code })
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone_number: phone, password: 'SuperSecret1' })
      .expect(200);
    const loginBody = loginRes.body as LoginResponseBody;

    expect(typeof loginBody.access_token).toBe('string');
    expect(loginBody.user.role).toBe('CUSTOMER');
  });

  it('rejects duplicate phone registration with 409 (Req 2)', async () => {
    const phone = uniquePhone();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ full_name: 'Dup', phone_number: phone, password: 'SuperSecret1' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ full_name: 'Dup', phone_number: phone, password: 'SuperSecret1' })
      .expect(409);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('PHONE_ALREADY_REGISTERED');
  });

  it('rejects login for an unverified account with 401 (Req 7)', async () => {
    const phone = uniquePhone();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        full_name: 'Unverified',
        phone_number: phone,
        password: 'SuperSecret1',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone_number: phone, password: 'SuperSecret1' })
      .expect(401);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects login with the wrong password with 401 (Req 7)', async () => {
    const phone = uniquePhone();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        full_name: 'WrongPass',
        phone_number: phone,
        password: 'SuperSecret1',
      })
      .expect(201);
    const code = await readOtp(phone);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone_number: phone, code })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone_number: phone, password: 'WrongPassword1' })
      .expect(401);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown phone number at login with 401, not 404 (Req 7)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone_number: uniquePhone(), password: 'Whatever123' })
      .expect(401);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('INVALID_CREDENTIALS');
  });

  it('caps wrong OTP attempts at 5 and invalidates the OTP (Req 5)', async () => {
    const phone = uniquePhone();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        full_name: 'CapTest',
        phone_number: phone,
        password: 'SuperSecret1',
      })
      .expect(201);

    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone_number: phone, code: '000000' })
        .expect(400);
      const body = res.body as ErrorResponseBody;
      expect(body.error).toBe('INVALID_OTP');
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone_number: phone, code: '000000' })
      .expect(429);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('OTP_ATTEMPTS_EXCEEDED');

    await expect(readOtp(phone)).rejects.toThrow();
  });
});
