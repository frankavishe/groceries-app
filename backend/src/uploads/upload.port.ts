export const UPLOAD_SERVICE = 'UPLOAD_SERVICE';

export interface UploadedFileInput {
  buffer: Buffer;
  mimeType: string;
}

// S3 is the concrete implementation; local/dev uses a disk-backed fallback
// instead (mirrors OtpSenderPort's adapter pattern — see specs/constitution.md).
export interface UploadPort {
  // keyPrefix e.g. "products/{id}" or "categories/{id}" — returns the
  // resulting object's public URL.
  upload(file: UploadedFileInput, keyPrefix: string): Promise<string>;
}
