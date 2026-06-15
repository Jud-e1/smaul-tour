import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { VectorDatabaseService } from './vector-database.service';

const mockDataSource = {
  query: jest.fn(),
};

describe('VectorDatabaseService', () => {
  let service: VectorDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorDatabaseService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<VectorDatabaseService>(VectorDatabaseService);
    jest.clearAllMocks();
  });

  // ─── ensureSchema() ───────────────────────────────────────────────────────

  describe('ensureSchema', () => {
    it('should call CREATE EXTENSION IF NOT EXISTS vector', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.ensureSchema();

      expect(mockDataSource.query).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS vector');
    });

    it('should create experience_embeddings and user_preference_embeddings tables', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.ensureSchema();

      const calls: string[] = mockDataSource.query.mock.calls.map((c: string[]) => c[0] as string);
      expect(calls.some((sql) => sql.includes('experience_embeddings'))).toBe(true);
      expect(calls.some((sql) => sql.includes('user_preference_embeddings'))).toBe(true);
    });

    it('should set pgvectorAvailable=false and return early when CREATE EXTENSION throws', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('extension not found'));

      // Should not throw
      await expect(service.ensureSchema()).resolves.toBeUndefined();

      // Only the first query (CREATE EXTENSION) should have been called
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });
  });

  // ─── upsertExperienceEmbedding() ──────────────────────────────────────────

  describe('upsertExperienceEmbedding', () => {
    it('should call INSERT...ON CONFLICT with correct params when pgvector is available', async () => {
      // Enable pgvector by running ensureSchema successfully first
      mockDataSource.query.mockResolvedValue([]);
      await service.ensureSchema();
      mockDataSource.query.mockClear();

      const embedding = [0.1, 0.2, 0.3];
      await service.upsertExperienceEmbedding('exp-1', embedding);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDataSource.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO experience_embeddings');
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe('exp-1');
      expect(params[1]).toBe('[0.1,0.2,0.3]');
    });

    it('should return early without querying when pgvector is not available', async () => {
      // pgvector not available — ensureSchema was never called successfully
      await service.upsertExperienceEmbedding('exp-1', [0.1, 0.2, 0.3]);

      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });

  // ─── upsertUserPreferenceEmbedding() ──────────────────────────────────────

  describe('upsertUserPreferenceEmbedding', () => {
    it('should call INSERT...ON CONFLICT with correct params when pgvector is available', async () => {
      mockDataSource.query.mockResolvedValue([]);
      await service.ensureSchema();
      mockDataSource.query.mockClear();

      const embedding = [0.1, 0.2, 0.3];
      await service.upsertUserPreferenceEmbedding('user-1', embedding);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDataSource.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO user_preference_embeddings');
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe('user-1');
      expect(params[1]).toBe('[0.1,0.2,0.3]');
    });

    it('should return early when pgvector is not available', async () => {
      await service.upsertUserPreferenceEmbedding('user-1', [0.1, 0.2, 0.3]);

      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });

  // ─── searchSimilarExperiences() ───────────────────────────────────────────

  describe('searchSimilarExperiences', () => {
    it('should call cosine similarity query and map results correctly', async () => {
      mockDataSource.query.mockResolvedValue([]);
      await service.ensureSchema();
      mockDataSource.query.mockResolvedValueOnce([
        { experience_id: 'exp-1', similarity: 0.9 },
        { experience_id: 'exp-2', similarity: 0.8 },
      ]);

      const results = await service.searchSimilarExperiences([0.1, 0.2, 0.3], 0.7, 5);

      const [sql, params] =
        mockDataSource.query.mock.calls[mockDataSource.query.mock.calls.length - 1];
      expect(sql).toContain('<=>');
      expect(params[0]).toBe('[0.1,0.2,0.3]');
      expect(params[1]).toBe(0.7);
      expect(params[2]).toBe(5);

      expect(results).toEqual([
        { experienceId: 'exp-1', similarity: 0.9 },
        { experienceId: 'exp-2', similarity: 0.8 },
      ]);
    });

    it('should return empty array when pgvector is not available', async () => {
      const results = await service.searchSimilarExperiences([0.1, 0.2, 0.3], 0.7, 5);

      expect(results).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });
});
