import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { Roles } from '../src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import configuration from '../src/config/configuration';
import { envValidationSchema } from '../src/config/env.validation';
import { UserRole } from '../src/users/entities/user.entity';

// Auth module itself has no protected routes yet (Users module owns those,
// out of scope for M2) — this throwaway controller exercises the real guard
// chain (JwtAuthGuard + RolesGuard) end-to-end against Req 8, 10-12.
@Controller('rbac-test')
class RbacTestController {
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { ok: true };
  }
}

describe('RBAC guards (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema: envValidationSchema,
        }),
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow<string>('jwt.secret'),
            signOptions: {
              expiresIn: config.get<number>('jwt.accessTokenTtl'),
            },
          }),
        }),
      ],
      controllers: [RbacTestController],
      providers: [JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects with 401 when no token is provided (Req 11)', async () => {
    await request(app.getHttpServer()).get('/rbac-test/admin-only').expect(401);
  });

  it('rejects with 401 for a malformed token (Req 11)', async () => {
    await request(app.getHttpServer())
      .get('/rbac-test/admin-only')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('rejects with 401 for an expired token (Req 9, 11)', async () => {
    const expired = await jwtService.signAsync(
      { sub: 'user-1', role: UserRole.ADMIN, phone_number: '+255700000000' },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .get('/rbac-test/admin-only')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('rejects with 403 when the role is not permitted (Req 10)', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-2',
      role: UserRole.CUSTOMER,
      phone_number: '+255700000001',
    });
    await request(app.getHttpServer())
      .get('/rbac-test/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows the request when the role is permitted (Req 8)', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-3',
      role: UserRole.ADMIN,
      phone_number: '+255700000002',
    });
    const res = await request(app.getHttpServer())
      .get('/rbac-test/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
