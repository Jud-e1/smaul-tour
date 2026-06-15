import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EmbeddingService } from './embedding.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-api-key'),
};

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-api-key');
  });

  // ─── generateEmbedding() ──────────────────────────────────────────────────

  describe('generateEmbedding', () => {
    it('should return cached value on cache hit', async () => {
      const cached = [0.1, 0.2, 0.3];
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.generateEmbedding('hello');

      expect(result).toBe(cached);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should call OpenAI API on cache miss and store result in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const embedding = [0.1, 0.2, 0.3];
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding, index: 0 }] },
      });

      const result = await service.generateEmbedding('hello');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(result).toEqual(embedding);
      expect(mockCacheManager.set).toHaveBeenCalledWith(expect.any(String), embedding, 3600);
    });
  });

  // ─── generateBatchEmbeddings() ────────────────────────────────────────────

  describe('generateBatchEmbeddings', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.generateBatchEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return cached values without calling API when all cached', async () => {
      const emb1 = [0.1, 0.2];
      const emb2 = [0.3, 0.4];
      mockCacheManager.get.mockResolvedValueOnce(emb1).mockResolvedValueOnce(emb2);

      const result = await service.generateBatchEmbeddings(['text1', 'text2']);

      expect(result).toEqual([emb1, emb2]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should make a single batch API call for uncached items and mix with cached', async () => {
      const cachedEmb = [0.1, 0.2];
      const uncachedEmb = [0.3, 0.4];
      // First text cached, second not
      mockCacheManager.get.mockResolvedValueOnce(cachedEmb).mockResolvedValueOnce(null);
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: uncachedEmb, index: 0 }] },
      });

      const result = await service.generateBatchEmbeddings(['text1', 'text2']);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(result[0]).toEqual(cachedEmb);
      expect(result[1]).toEqual(uncachedEmb);
    });
  });

  // ─── generateExperienceEmbedding() ────────────────────────────────────────

  describe('generateExperienceEmbedding', () => {
    it('should combine title, description, category with " | " separator', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const embedding = [0.1, 0.2, 0.3];
      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding, index: 0 }] },
      });

      await service.generateExperienceEmbedding({
        title: 'City Tour',
        description: 'A great tour',
        category: ['walking', 'culture'],
      });

      const postCall = mockedAxios.post.mock.calls[0];
      const body = postCall[1] as { input: string[] };
      expect(body.input[0]).toBe('City Tour | A great tour | walking, culture');
    });

    it('should delegate to generateEmbedding', async () => {
      const spy = jest.spyOn(service, 'generateEmbedding').mockResolvedValue([0.1, 0.2]);

      await service.generateExperienceEmbedding({
        title: 'Tour',
        description: 'Desc',
        category: ['food'],
      });

      expect(spy).toHaveBeenCalledWith('Tour | Desc | food');
    });
  });
});
