import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // bufferLogs: true holds any log calls made before app.useLogger() below
  // takes over, so nothing logged during module instantiation is lost to
  // Nest's default console logger instead of pino.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // specs/hardening/design.md's Security Headers section.
  // crossOriginResourcePolicy is relaxed from helmet's 'same-origin'
  // default because /uploads (local-disk image fallback, see
  // uploads/local-disk-upload.adapter.ts) is deliberately served
  // cross-origin — admin-web's browser and the mobile app both load
  // product/category images from it.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 'health' excluded so the ALB/ECS health check (specs/hardening/design.md)
  // hits the conventional bare /health path, not /api/v1/health.
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serves files written by uploads/local-disk-upload.adapter.ts when no S3
  // credentials are configured — local dev only, never used when S3 is live.
  const config = app.get(ConfigService);
  const localUploadsDir = config.getOrThrow<string>('uploads.localDir');
  app.useStaticAssets(join(process.cwd(), localUploadsDir), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
