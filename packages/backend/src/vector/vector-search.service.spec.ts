import { Test, TestingModule } from '@nestjs/testing';
import { VectorSearchService } from './vector-search.service';
import { VectorDatabaseService } from './vector-database.service';
import { EmbeddingService } from './embedding.service';

const mockVectorDatabaseService = {
  searchSimilarExperiences: jest.fn(),
  upsertExperienceEmbedding: jest.fn(),
  deleteExperienceEmbedding: jest.fn(),
};

const mockEmbeddingService = {
  generateEmbedding: jest.fn(),
  generateExperienceEmbedding: jest.fn(),
};

describe('VectorSearchService', () => {
  let service: VectorSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorSearchService,
        { provide: VectorDatabaseService, useValue: mockVectorDatabaseService },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<VectorSearchService>(VectorSearchService);
    jest.clearAllMocks();
  });

  // ─── semanticSearchExperiences() ─────────────────────────────────────────

  describe('semanticSearchExperiences', () => {
    it('should generate embedding from query text and call searchSimilarExperiences', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const searchResults = [{ experienceId: 'exp-1', similarity: 0.9 }];
      mockEmbeddingService.generateEmbedding.mockResolvedValue(embedding);
      mockVectorDatabaseService.searchSimilarExperiences.mockResolvedValue(searchResults);

      const result = await service.semanticSearchExperiences('beach tour');

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('beach tour');
      expect(mockVectorDatabaseService.searchSimilarExperiences).toHaveBeenCalledWith(
        embedding,
        0.7,
        10,
      );
      expect(result).toEqual(searchResults);
    });

    it('should pass custom threshold and limit', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1]);
      mockVectorDatabaseService.searchSimilarExperiences.mockResolvedValue([]);

      await service.semanticSearchExperiences('tour', 0.8, 5);

      expect(mockVectorDatabaseService.searchSimilarExperiences).toHaveBeenCalledWith(
        [0.1],
        0.8,
        5,
      );
    });
  });

  // ─── indexExperience() ────────────────────────────────────────────────────

  describe('indexExperience', () => {
    it('should generate experience embedding and call upsertExperienceEmbedding', async () => {
      const embedding = [0.1, 0.2, 0.3];
      mockEmbeddingService.generateExperienceEmbedding.mockResolvedValue(embedding);
      mockVectorDatabaseService.upsertExperienceEmbedding.mockResolvedValue(undefined);

      await service.indexExperience({
        id: 'exp-1',
        title: 'City Tour',
        description: 'A great tour',
        category: ['walking'],
      });

      expect(mockEmbeddingService.generateExperienceEmbedding).toHaveBeenCalledWith({
        id: 'exp-1',
        title: 'City Tour',
        description: 'A great tour',
        category: ['walking'],
      });
      expect(mockVectorDatabaseService.upsertExperienceEmbedding).toHaveBeenCalledWith(
        'exp-1',
        embedding,
      );
    });
  });

  // ─── removeExperienceIndex() ──────────────────────────────────────────────

  describe('removeExperienceIndex', () => {
    it('should call deleteExperienceEmbedding with the experience id', async () => {
      mockVectorDatabaseService.deleteExperienceEmbedding.mockResolvedValue(undefined);

      await service.removeExperienceIndex('exp-1');

      expect(mockVectorDatabaseService.deleteExperienceEmbedding).toHaveBeenCalledWith('exp-1');
    });
  });
});
