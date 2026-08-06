import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DeliveryModule } from './delivery/delivery.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logging/logger.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule,
    ScheduleModule.forRoot(),
    // specs/hardening/design.md's Rate Limiting section: a single 'default'
    // throttler applied everywhere; auth.controller.ts and
    // payments.controller.ts's callback route each override it to a
    // stricter limit via @Throttle({ default: { limit, ttl } }) — NOT
    // additional named throttlers, since every named throttler registered
    // here would apply to every route (ThrottlerGuard iterates all of them
    // per request), the opposite of "stricter on some routes only".
    // Skipped entirely under Jest (NODE_ENV=test, set automatically by the
    // Jest CLI) so existing e2e suites — including M4's 20-parallel
    // stock-lock concurrency test — aren't themselves throttled.
    ThrottlerModule.forRoot({
      skipIf: () => process.env.NODE_ENV === 'test',
      throttlers: [{ name: 'default', limit: 120, ttl: 60000 }],
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    UploadsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    DeliveryModule,
    PaymentsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
