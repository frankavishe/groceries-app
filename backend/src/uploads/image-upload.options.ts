import { BadRequestException } from '@nestjs/common';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { ALLOWED_IMAGE_MIME_TYPES } from './image-mime-types';

// Shared by both the products and categories image-upload endpoints.
export const imageUploadOptions: MulterModuleOptions = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException('Only jpg, png, and webp images are allowed'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
