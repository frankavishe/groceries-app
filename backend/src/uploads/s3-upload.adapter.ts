import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extensionFromMimeType } from './image-mime-types';
import { UploadedFileInput, UploadPort } from './upload.port';

export class S3UploadAdapter implements UploadPort {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(file: UploadedFileInput, keyPrefix: string): Promise<string> {
    const key = `${keyPrefix}/${randomUUID()}${extensionFromMimeType(file.mimeType)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
