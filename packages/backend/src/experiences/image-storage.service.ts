import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MulterFile } from './interfaces/experience.interfaces';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class ImageStorageService {
  validateFile(file: MulterFile): void {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds the 10MB limit');
    }
  }

  generateFilename(_originalname: string, mimetype: string): string {
    const ext = MIME_TO_EXT[mimetype] ?? '.jpg';
    return `${randomUUID()}${ext}`;
  }

  // TODO: Replace with actual S3 upload and sharp image processing
  async processAndUpload(
    _file: MulterFile,
    filename: string
  ): Promise<{ url: string; thumbnailUrl: string; mediumUrl: string }> {
    return {
      url: `https://storage.example.com/images/${filename}`,
      thumbnailUrl: `https://storage.example.com/images/thumb_${filename}`,
      mediumUrl: `https://storage.example.com/images/medium_${filename}`,
    };
  }
}
