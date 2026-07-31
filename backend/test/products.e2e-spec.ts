import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/users/entities/user.entity';

interface ProductResponseBody {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock_quantity: number;
  in_stock: boolean;
  image_url: string | null;
  category_id: number | null;
}

interface PaginatedProductsBody {
  data: ProductResponseBody[];
  total: number;
  page: number;
  pageSize: number;
}

interface ErrorResponseBody {
  statusCode: number;
  error?: string;
  message: string | string[];
}

interface CategoryResponseBody {
  id: number;
}

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Minimal valid 1x1 PNG for multipart upload tests.
const PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082',
  'hex',
);

describe('Products (e2e)', () => {
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
      phone_number: '+255700000097',
    });
    customerToken = await jwtService.signAsync({
      sub: 'customer-e2e',
      role: UserRole.CUSTOMER,
      phone_number: '+255700000096',
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
        name: uniqueName('Product'),
        price: 1000,
        unit: 'pack',
        ...overrides,
      })
      .expect(201);
    return res.body as ProductResponseBody;
  }

  it('creates a product as admin (Req 5)', async () => {
    const product = await createProduct({ price: 2500, stock_quantity: 7 });
    expect(product.price).toBe(2500);
    expect(product.stock_quantity).toBe(7);
    expect(product.in_stock).toBe(true);
  });

  it('rejects price < 0 with 400 before hitting the DB (Req 11)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('BadPrice'), price: -1, unit: 'pack' })
      .expect(400);
    const body = res.body as ErrorResponseBody;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('price')]),
    );
  });

  it('rejects non-admin create with 403 (Req 10)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: uniqueName('ShouldFail'), price: 100, unit: 'pack' })
      .expect(403);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('FORBIDDEN_ROLE');
  });

  it('lists an out-of-stock product with in_stock=false, still visible (Req 4)', async () => {
    const product = await createProduct({ stock_quantity: 0 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ search: product.name })
      .expect(200);
    const body = res.body as PaginatedProductsBody;
    const match = body.data.find((p) => p.id === product.id);
    expect(match).toBeDefined();
    expect(match?.in_stock).toBe(false);
    expect(match?.stock_quantity).toBe(0);
  });

  it('filters by search (case-insensitive) (Req 2)', async () => {
    const product = await createProduct({ name: uniqueName('Zzzucchini') });

    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ search: product.name.toUpperCase() })
      .expect(200);
    const body = res.body as PaginatedProductsBody;
    expect(body.data.some((p) => p.id === product.id)).toBe(true);
  });

  it('filters by category_id (Req 3)', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueName('FilterCategory') })
      .expect(201);
    const categoryBody = category.body as CategoryResponseBody;

    const product = await createProduct({ category_id: categoryBody.id });
    const otherProduct = await createProduct();

    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ category_id: categoryBody.id, pageSize: 100 })
      .expect(200);
    const body = res.body as PaginatedProductsBody;
    const ids = body.data.map((p) => p.id);
    expect(ids).toContain(product.id);
    expect(ids).not.toContain(otherProduct.id);
  });

  it('updates a product, incl. is_available=false hiding it from public listing (Req 6, 7)', async () => {
    const product = await createProduct();

    const patched = await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 9999 })
      .expect(200);
    expect((patched.body as ProductResponseBody).price).toBe(9999);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_available: false })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ search: product.name })
      .expect(200);
    const body = res.body as PaginatedProductsBody;
    expect(body.data.find((p) => p.id === product.id)).toBeUndefined();
  });

  it('returns products at or below the low-stock threshold, admin only (Req 8, 10)', async () => {
    const lowStockProduct = await createProduct({ stock_quantity: 1 });

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/products/low-stock')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    expect((forbidden.body as ErrorResponseBody).error).toBe('FORBIDDEN_ROLE');

    const res = await request(app.getHttpServer())
      .get('/api/v1/products/low-stock')
      .query({ threshold: 5 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as ProductResponseBody[];
    expect(body.some((p) => p.id === lowStockProduct.id)).toBe(true);
    expect(body.every((p) => p.stock_quantity <= 5)).toBe(true);
  });

  it('uploads a product image and sets image_url (Req 9)', async () => {
    const product = await createProduct();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.id}/image`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PNG_BUFFER, {
        filename: 'test.png',
        contentType: 'image/png',
      })
      .expect(201);
    const body = res.body as ProductResponseBody;
    expect(body.image_url).toEqual(
      expect.stringContaining('/uploads/products/'),
    );
  });

  it('rejects a non-image file upload with 400', async () => {
    const product = await createProduct();

    await request(app.getHttpServer())
      .post(`/api/v1/products/${product.id}/image`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('not an image'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });
});
