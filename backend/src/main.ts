import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
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
