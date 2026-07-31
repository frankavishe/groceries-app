import { Module } from '@nestjs/common';
import { uploadServiceProvider } from './upload.provider';
import { UPLOAD_SERVICE } from './upload.port';

@Module({
  providers: [uploadServiceProvider],
  exports: [UPLOAD_SERVICE],
})
export class UploadsModule {}
