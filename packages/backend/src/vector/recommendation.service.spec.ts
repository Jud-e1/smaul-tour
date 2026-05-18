import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { RecommendationService } from './recommendation.service';
import { VectorDatabaseService } from './vector-database.service';
import { EmbeddingService } from './embedding.service';

const mockDataSource = {
  query: jest.fn(),
};

const mockVectorDatabaseService = {
  searchSimilarExperiences: jest.fn(),
  upsertUserPreferenceEmbedding: jest.fn(),
};

const mockEmbeddingService = {
  generateExperienceEmbedding: jest.fn(),
};

describe('RecommendationService', () => {
  let service: RecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: VectorDatabaseService, useValue: mockVectorDatabaseService },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    jest.clearAllMocks();
  });

  // ─── getSimilarExperiences() ──────────────────────────────────────────────

  describe('getSimilarExperiences', () => {
    it('should return empty array when no embedding found in DB', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getSimilarExperiences('exp-1');

      expect(result).toEqual([]);
      expect(mockVectorDatabaseService.searchSimilarExperiences).not.toHaveBeenCalled();
    });

    it('should return empty array when embedding row has no embedding value', async () => {
      mockDataSource.query.mockResolvedValue([{ embedding: null }]);

      const result = await service.getSimilarExperiences('exp-1');

      expect(result).toEqual([]);
    });

    it('should fetch embedding, call searchSimilarExperiences, and filter out source id', async () => {
      mockDataSource.query.mockResolvedValue([{ embedding: '[0.1,0.2,0.3]' }]);
      mockVectorDatabaseService.searchSimilarExperiences.mockResolvedValue([
        { experienceId: 'exp-1', similarity: 1.0 },
        { experienceId: 'exp-2', similarity: 0.9 },
        { experienceId: 'exp-3', similarity: 0.8 },
      ]);

      const result = await service.getSimilarExperiences('exp-1', 5);

      expect(mockVectorDatabaseService.searchSimilarExperiences).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        0.7,
        6, // limit + 1
      );
      // Source id filtered out
      expect(result.find((r) => r.experienceId === 'exp-1')).toBeUndefined();
      expect(result).toHaveLength(2);
    });

    it('should return up to limit results', async () => {
      mockDataSource.query.mockResolvedValue([{ embedding: '[0.1,0.2,0.3]' }]);
      mockVectorDatabaseService.searchSimilarExperiences.mockResolvedValue([
        { experienceId: 'exp-2', similarity: 0.95 },
        { experienceId: 'exp-3', similarity: 0.9 },
        { experienceId: 'exp-4', similarity: 0.85 },
      ]);

      const result = await service.getSimilarExperiences('exp-1', 2);

      expect(result).toHaveLength(2);
    });
  });

  // ─── getPersonalizedRecommendations() ────────────────────────────────────

  describe('getPersonalizedRecommendations', () => {
    it('should return empty array when no user preference embedding found', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1');

      expect(result).toEqual([]);
      expect(mockVectorDatabaseService.searchSimilarExperiences).not.toHaveBeenCalled();
    });

    it('should return empty array when embedding row has no embedding value', async () => {
      mockDataSource.query.mockResolvedValue([{ embedding: null }]);

      const result = await service.getPersonalizedRecommendations('user-1');

      expect(result).toEqual([]);
    });

    it('should fetch user embedding and call searchSimilarExperiences with threshold 0.5', async () => {
      mockDataSource.query.mockResolvedValue([{ embedding: '[0.1,0.2,0.3]' }]);
      const searchResults = [{ experienceId: 'exp-1', similarity: 0.7 }];
      mockVectorDatabaseService.searchSimilarExperiences.mockResolvedValue(searchResults);

      const result = await service.getPersonalizedRecommendations('user-1', 10);

      expect(mockVectorDatabaseService.searchSimilarExperiences).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        0.5,
        10,
      );
      expect(result).toEqual(searchResults);
    });
  });

  // ─── updateUserPreferences() ──────────────────────────────────────────────

  describe('updateUserPreferences', () => {
    const experience = {
      title: 'City Tour',
      description: 'A great tour',
      category: ['walking'],
    };

    it('should create new embedding when no existing preference', async () => {
      const newEmb = [0.1, 0.2, 0.3];
      mockEmbeddingService.generateExperienceEmbedding.mockResolvedValue(newEmb);
      mockDataSource.query.mockResolvedValue([]); // no existing preference
      mockVectorDatabaseService.upsertUserPreferenceEmbedding.mockResolvedValue(undefined);

      await service.updateUserPreferences('user-1', experience);

      expect(mockVectorDatabaseService.upsertUserPreferenceEmbedding).toHaveBeenCalledWith(
        'user-1',
        newEmb,
      );
    });

    it('should average embeddings when existing preference found', async () => {
      const newEmb = [0.2, 0.4, 0.6];
      const existingEmb = '[0.4,0.8,1.0]';
      mockEmbeddingService.generateExperienceEmbedding.mockResolvedValue(newEmb);
      mockDataSource.query.mockResolvedValue([{ embedding: existingEmb }]);
      mockVectorDatabaseService.upsertUserPreferenceEmbedding.mockResolvedValue(undefined);

      await service.updateUserPreferences('user-1', experience);

      // Average: (0.4+0.2)/2=0.3, (0.8+0.4)/2=0.6, (1.0+0.6)/2=0.8
      expect(mockVectorDatabaseService.upsertUserPreferenceEmbedding).toHaveBeenCalledWith(
        'user-1',
        [0.3, 0.6, 0.8],
      );
    });

    it('should call upsertUserPreferenceEmbedding with correct userId', async () => {
      mockEmbeddingService.generateExperienceEmbedding.mockResolvedValue([0.1]);
      mockDataSource.query.mockResolvedValue([]);
      mockVectorDatabaseService.upsertUserPreferenceEmbedding.mockResolvedValue(undefined);

      await service.updateUserPreferences('user-42', experience);

      expect(mockVectorDatabaseService.upsertUserPreferenceEmbedding).toHaveBeenCalledWith(
        'user-42',
        expect.any(Array),
      );
    });
  });
});
