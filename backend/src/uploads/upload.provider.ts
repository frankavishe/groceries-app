import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalDiskUploadAdapter } from './local-disk-upload.adapter';
import { S3UploadAdapter } from './s3-upload.adapter';
import { UPLOAD_SERVICE, UploadPort } from './upload.port';

export const uploadServiceProvider: Provider = {
  provide: UPLOAD_SERVICE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): UploadPort => {
    const bucket = config.get<string>('s3.bucket');
    const region = config.get<string>('s3.region');
    const accessKeyId = config.get<string>('s3.accessKeyId');
    const secretAccessKey = config.get<string>('s3.secretAccessKey');

    if (bucket && region && accessKeyId && secretAccessKey) {
      return new S3UploadAdapter(bucket, region, accessKeyId, secretAccessKey);
    }

    const localDir = config.getOrThrow<string>('uploads.localDir');
    const appOrigin = config.getOrThrow<string>('uploads.publicBaseUrl');
    return new LocalDiskUploadAdapter(localDir, `${appOrigin}/uploads`);
  },
};
