import { BadRequestException } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';
import { MulterFile } from './interfaces/experience.interfaces';

function makeFile(overrides: Partial<MulterFile> = {}): MulterFile {
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from(''),
    ...overrides,
  };
}

describe('ImageStorageService', () => {
  let service: ImageStorageService;

  beforeEach(() => {
    service = new ImageStorageService();
  });

  // ─── validateFile() ───────────────────────────────────────────────────────

  describe('validateFile', () => {
    it('should not throw for valid JPEG file under 10MB', () => {
      expect(() =>
        service.validateFile(makeFile({ mimetype: 'image/jpeg', size: 1024 }))
      ).not.toThrow();
    });

    it('should not throw for valid PNG file under 10MB', () => {
      expect(() =>
        service.validateFile(makeFile({ mimetype: 'image/png', size: 1024 }))
      ).not.toThrow();
    });

    it('should not throw for valid WebP file under 10MB', () => {
      expect(() =>
        service.validateFile(makeFile({ mimetype: 'image/webp', size: 1024 }))
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid mimetype', () => {
      expect(() => service.validateFile(makeFile({ mimetype: 'image/gif' }))).toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for file exceeding 10MB', () => {
      const oversized = 10 * 1024 * 1024 + 1;
      expect(() => service.validateFile(makeFile({ size: oversized }))).toThrow(
        BadRequestException
      );
    });
  });

  // ─── generateFilename() ───────────────────────────────────────────────────

  describe('generateFilename', () => {
    it('should return a string ending with .jpg for image/jpeg', () => {
      const filename = service.generateFilename('photo.jpg', 'image/jpeg');
      expect(filename).toMatch(/\.jpg$/);
    });

    it('should return a string ending with .png for image/png', () => {
      const filename = service.generateFilename('photo.png', 'image/png');
      expect(filename).toMatch(/\.png$/);
    });

    it('should return a string ending with .webp for image/webp', () => {
      const filename = service.generateFilename('photo.webp', 'image/webp');
      expect(filename).toMatch(/\.webp$/);
    });

    it('should generate unique filenames on successive calls', () => {
      const first = service.generateFilename('photo.jpg', 'image/jpeg');
      const second = service.generateFilename('photo.jpg', 'image/jpeg');
      expect(first).not.toBe(second);
    });
  });

  // ─── processAndUpload() ───────────────────────────────────────────────────

  describe('processAndUpload', () => {
    it('should return url, thumbnailUrl, mediumUrl containing the filename', async () => {
      const filename = 'abc123.jpg';
      const result = await service.processAndUpload(makeFile(), filename);

      expect(result.url).toContain(filename);
      expect(result.thumbnailUrl).toContain(filename);
      expect(result.mediumUrl).toContain(filename);
    });

    it('should return stub URLs with storage.example.com domain', async () => {
      const result = await service.processAndUpload(makeFile(), 'test.jpg');

      expect(result.url).toContain('storage.example.com');
      expect(result.thumbnailUrl).toContain('storage.example.com');
      expect(result.mediumUrl).toContain('storage.example.com');
    });
  });
});
