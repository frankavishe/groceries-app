const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(MIME_EXTENSIONS);

export function extensionFromMimeType(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] ?? '';
}
