import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/users/entities/user.entity';

interface CategoryResponseBody {
  id: number;
  name: string;
  icon_url: string | null;
  is_active: boolean;
}

interface ErrorResponseBody {
  statusCode: number;
  error?: string;
  message: string | string[];
}

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let customerToken: string;

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
    adminToken = await jwtService.signAsync({
      sub: 'admin-e2e',
      role: UserRole.ADMIN,
      phone_number: '+255700000099',
    });
    customerToken = await jwtService.signAsync({
      sub: 'customer-e2e',
      role: UserRole.CUSTOMER,
      phone_number: '+255700000098',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a category as admin, defaulting is_active=true (Req 2)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('Category') })
      .expect(201);
    const body = res.body as CategoryResponseBody;
    expect(body.is_active).toBe(true);
    expect(typeof body.id).toBe('number');
  });

  it('lists only active categories with snake_case fields (Req 1)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('ListedCategory') })
      .expect(201);
    const createdBody = created.body as CategoryResponseBody;

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);
    const body = res.body as CategoryResponseBody[];
    const match = body.find((c) => c.id === createdBody.id);
    expect(match).toBeDefined();
    expect(match).toEqual(
      expect.objectContaining({ icon_url: null, is_active: true }),
    );
  });

  it('updates a category (Req 3)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('ToUpdate') })
      .expect(201);
    const createdBody = created.body as CategoryResponseBody;

    const newName = uniqueName('Updated');
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: newName })
      .expect(200);
    const body = res.body as CategoryResponseBody;
    expect(body.name).toBe(newName);
  });

  it('soft-deletes via is_active=false and it disappears from listing (Req 4)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('ToDeactivate') })
      .expect(201);
    const createdBody = created.body as CategoryResponseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);
    const body = res.body as CategoryResponseBody[];
    expect(body.find((c) => c.id === createdBody.id)).toBeUndefined();
  });

  it('GET /categories/admin includes deactivated categories, admin only', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('AdminVisible') })
      .expect(201);
    const createdBody = created.body as CategoryResponseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false })
      .expect(200);

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/categories/admin')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    expect((forbidden.body as ErrorResponseBody).error).toBe('FORBIDDEN_ROLE');

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as CategoryResponseBody[];
    const match = body.find((c) => c.id === createdBody.id);
    expect(match).toBeDefined();
    expect(match?.is_active).toBe(false);
  });

  it('rejects non-admin writes with 403 (Req 5)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: uniqueName('ShouldFail') })
      .expect(403);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('FORBIDDEN_ROLE');
  });

  it('rejects writes with no token with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ name: uniqueName('NoAuth') })
      .expect(401);
  });
});
