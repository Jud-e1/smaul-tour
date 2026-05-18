import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(async () => {
    await service.clear();
  });

  describe('get / set', () => {
    it('returns null for missing key', async () => {
      expect(await service.get('missing')).toBeNull();
    });

    it('returns stored value', async () => {
      await service.set('key', { foo: 'bar' });
      expect(await service.get('key')).toEqual({ foo: 'bar' });
    });

    it('returns null after TTL expires', async () => {
      await service.set('key', 'value', 10); // 10ms TTL
      await new Promise((r) => setTimeout(r, 20));
      expect(await service.get('key')).toBeNull();
    });

    it('uses default 5-minute TTL when not specified', async () => {
      await service.set('key', 'value');
      // Should still be present immediately
      expect(await service.get('key')).toBe('value');
    });
  });

  describe('delete', () => {
    it('removes a key', async () => {
      await service.set('key', 'value');
      await service.delete('key');
      expect(await service.get('key')).toBeNull();
    });

    it('does not throw when deleting non-existent key', async () => {
      await expect(service.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all entries', async () => {
      await service.set('a', 1);
      await service.set('b', 2);
      await service.clear();
      expect(service.size()).toBe(0);
    });
  });

  describe('evictExpired', () => {
    it('removes expired entries', async () => {
      await service.set('expired', 'v', 10);
      await service.set('valid', 'v', 60000);
      await new Promise((r) => setTimeout(r, 20));
      service.evictExpired();
      expect(service.size()).toBe(1);
      expect(await service.get('valid')).toBe('v');
    });
  });
});
