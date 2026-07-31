import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { extensionFromMimeType } from './image-mime-types';
import { UploadedFileInput, UploadPort } from './upload.port';

// Local dev only — writes under {baseDir}/ and returns a URL served by
// main.ts's static assets middleware. Never selected when S3 credentials
// are configured (see upload.provider.ts).
export class LocalDiskUploadAdapter implements UploadPort {
  constructor(
    private readonly baseDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async upload(file: UploadedFileInput, keyPrefix: string): Promise<string> {
    const key = `${keyPrefix}/${randomUUID()}${extensionFromMimeType(file.mimeType)}`;
    const destPath = join(this.baseDir, key);
    await mkdir(join(this.baseDir, keyPrefix), { recursive: true });
    await writeFile(destPath, file.buffer);
    return `${this.publicBaseUrl}/${key}`;
  }
}
