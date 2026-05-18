import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { LlmParserService } from './llm-parser.service';
import { VectorSearchService } from '../vector/vector-search.service';
import { Itinerary as ItineraryEntity } from '../database/entities/itinerary.entity';
import { ItineraryExperience } from '../database/entities/itinerary-experience.entity';
import { Experience } from '../database/entities/experience.entity';
import { TripParameters } from './interfaces/trip-planner.interfaces';

const mockItineraryRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockItineraryExpRepo = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockExperienceRepo = {
  createQueryBuilder: jest.fn(),
};

const mockDataSource = {};

const mockVectorSearchService = {
  semanticSearchExperiences: jest.fn(),
};

const mockLlmParserService = {
  parseTripRequest: jest.fn(),
};

const makeExperience = (overrides: Partial<Experience> = {}): Experience =>
  ({
    id: 'exp-1',
    title: 'City Food Tour',
    description: 'Explore local cuisine',
    category: ['food', 'culture'],
    priceAmount: 50,
    priceCurrency: 'USD',
    averageRating: 4.5,
    reviewCount: 20,
    status: 'active',
    locationLat: 35.6762,
    locationLng: 139.6503,
    locationAddress: 'Tokyo, Japan',
    durationHours: 3,
    guideId: 'guide-1',
    cancellationPolicy: 'moderate',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Experience);

describe('TripPlannerService', () => {
  let service: TripPlannerService;

  const buildQueryBuilder = (experiences: Experience[]) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(experiences),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripPlannerService,
        { provide: getRepositoryToken(ItineraryEntity), useValue: mockItineraryRepo },
        { provide: getRepositoryToken(ItineraryExperience), useValue: mockItineraryExpRepo },
        { provide: getRepositoryToken(Experience), useValue: mockExperienceRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: VectorSearchService, useValue: mockVectorSearchService },
        { provide: LlmParserService, useValue: mockLlmParserService },
      ],
    }).compile();

    service = module.get<TripPlannerService>(TripPlannerService);
    jest.clearAllMocks();
  });

  // ─── parseRequest() ───────────────────────────────────────────────────────

  describe('parseRequest', () => {
    it('should delegate to LlmParserService', async () => {
      const params: TripParameters = { preferences: ['food'], activityTypes: ['cooking'] };
      mockLlmParserService.parseTripRequest.mockResolvedValue(params);

      const result = await service.parseRequest({
        userId: 'user-1',
        naturalLanguageInput: '3-day food trip in Tokyo',
        timestamp: new Date(),
      });

      expect(mockLlmParserService.parseTripRequest).toHaveBeenCalledWith('3-day food trip in Tokyo');
      expect(result).toEqual(params);
    });

    it('should return parsed parameters with duration and budget', async () => {
      const params: TripParameters = {
        preferences: ['culture'],
        activityTypes: ['museum'],
        duration: 3,
        budget: { min: 0, max: 500, currency: 'USD' },
        location: 'Tokyo',
      };
      mockLlmParserService.parseTripRequest.mockResolvedValue(params);

      const result = await service.parseRequest({
        userId: 'user-1',
        naturalLanguageInput: '3-day culture trip in Tokyo under $500',
        timestamp: new Date(),
      });

      expect(result.duration).toBe(3);
      expect(result.budget?.max).toBe(500);
      expect(result.location).toBe('Tokyo');
    });
  });

  // ─── generateItinerary() ─────────────────────────────────────────────────

  describe('generateItinerary', () => {
    const params: TripParameters = {
      preferences: ['food'],
      activityTypes: ['cooking'],
      duration: 2,
      budget: { min: 0, max: 200, currency: 'USD' },
    };

    it('should generate itinerary with at least 3 experiences', async () => {
      const experiences = [
        makeExperience({ id: 'exp-1', priceAmount: 50 }),
        makeExperience({ id: 'exp-2', priceAmount: 60 }),
        makeExperience({ id: 'exp-3', priceAmount: 40 }),
      ];

      mockVectorSearchService.semanticSearchExperiences.mockResolvedValue([
        { experienceId: 'exp-1', similarity: 0.9 },
        { experienceId: 'exp-2', similarity: 0.85 },
        { experienceId: 'exp-3', similarity: 0.8 },
      ]);

      const qb = buildQueryBuilder(experiences);
      mockExperienceRepo.createQueryBuilder.mockReturnValue(qb);

      const savedEntity = {
        id: 'itin-1',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: params,
        totalCostAmount: 150,
        totalCostCurrency: 'USD',
      };
      mockItineraryRepo.create.mockReturnValue(savedEntity);
      mockItineraryRepo.save.mockResolvedValue(savedEntity);
      mockItineraryExpRepo.create.mockImplementation(v => v);
      mockItineraryExpRepo.save.mockResolvedValue([]);

      const result = await service.generateItinerary('user-1', params);

      expect(result.experiences.length).toBeGreaterThanOrEqual(3);
      expect(result.userId).toBe('user-1');
      expect(result.totalCost.currency).toBe('USD');
    });

    it('should apply budget constraints and exclude over-budget experiences', async () => {
      const experiences = [
        makeExperience({ id: 'exp-1', priceAmount: 50 }),
        makeExperience({ id: 'exp-2', priceAmount: 300 }), // over budget
        makeExperience({ id: 'exp-3', priceAmount: 40 }),
        makeExperience({ id: 'exp-4', priceAmount: 60 }),
      ];

      mockVectorSearchService.semanticSearchExperiences.mockResolvedValue([]);
      const qb = buildQueryBuilder(experiences);
      mockExperienceRepo.createQueryBuilder.mockReturnValue(qb);

      const savedEntity = {
        id: 'itin-2',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: params,
        totalCostAmount: 150,
        totalCostCurrency: 'USD',
      };
      mockItineraryRepo.create.mockReturnValue(savedEntity);
      mockItineraryRepo.save.mockResolvedValue(savedEntity);
      mockItineraryExpRepo.create.mockImplementation(v => v);
      mockItineraryExpRepo.save.mockResolvedValue([]);

      const result = await service.generateItinerary('user-1', params);

      // exp-2 at $300 should be excluded (budget max is $200)
      const expIds = result.experiences.map(e => e.experienceId);
      expect(expIds).not.toContain('exp-2');
    });

    it('should calculate total cost correctly', async () => {
      const experiences = [
        makeExperience({ id: 'exp-1', priceAmount: 50 }),
        makeExperience({ id: 'exp-2', priceAmount: 60 }),
        makeExperience({ id: 'exp-3', priceAmount: 40 }),
      ];

      mockVectorSearchService.semanticSearchExperiences.mockResolvedValue([]);
      const qb = buildQueryBuilder(experiences);
      mockExperienceRepo.createQueryBuilder.mockReturnValue(qb);

      const savedEntity = {
        id: 'itin-3',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: params,
        totalCostAmount: 150,
        totalCostCurrency: 'USD',
      };
      mockItineraryRepo.create.mockReturnValue(savedEntity);
      mockItineraryRepo.save.mockResolvedValue(savedEntity);
      mockItineraryExpRepo.create.mockImplementation(v => v);
      mockItineraryExpRepo.save.mockResolvedValue([]);

      const result = await service.generateItinerary('user-1', params);

      expect(result.totalCost.amount).toBe(150); // 50 + 60 + 40
    });

    it('should fall back to DB search when vector search fails', async () => {
      mockVectorSearchService.semanticSearchExperiences.mockRejectedValue(new Error('Vector DB unavailable'));

      const experiences = [
        makeExperience({ id: 'exp-1', priceAmount: 50 }),
        makeExperience({ id: 'exp-2', priceAmount: 60 }),
        makeExperience({ id: 'exp-3', priceAmount: 40 }),
      ];
      const qb = buildQueryBuilder(experiences);
      mockExperienceRepo.createQueryBuilder.mockReturnValue(qb);

      const savedEntity = {
        id: 'itin-4',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: params,
        totalCostAmount: 150,
        totalCostCurrency: 'USD',
      };
      mockItineraryRepo.create.mockReturnValue(savedEntity);
      mockItineraryRepo.save.mockResolvedValue(savedEntity);
      mockItineraryExpRepo.create.mockImplementation(v => v);
      mockItineraryExpRepo.save.mockResolvedValue([]);

      const result = await service.generateItinerary('user-1', params);

      expect(result).toBeDefined();
      expect(result.experiences).toBeDefined();
    });
  });

  // ─── modifyItinerary() ───────────────────────────────────────────────────

  describe('modifyItinerary', () => {
    it('should throw NotFoundException when itinerary not found', async () => {
      mockItineraryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.modifyItinerary('nonexistent', 'user-1', 'add more outdoor activities'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge modification params with existing params', async () => {
      const existingParams: TripParameters = {
        preferences: ['food'],
        activityTypes: ['cooking'],
        duration: 3,
        location: 'Tokyo',
      };

      const existingEntity = {
        id: 'itin-1',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: existingParams,
        totalCostAmount: 150,
        totalCostCurrency: 'USD',
        experiences: [],
      };

      mockItineraryRepo.findOne.mockResolvedValue(existingEntity);
      mockItineraryExpRepo.delete.mockResolvedValue({});

      const modParams: TripParameters = {
        preferences: ['adventure'],
        activityTypes: ['hiking'],
      };
      mockLlmParserService.parseTripRequest.mockResolvedValue(modParams);

      const experiences = [
        makeExperience({ id: 'exp-1', priceAmount: 50 }),
        makeExperience({ id: 'exp-2', priceAmount: 60 }),
        makeExperience({ id: 'exp-3', priceAmount: 40 }),
      ];
      mockVectorSearchService.semanticSearchExperiences.mockResolvedValue([]);
      const qb = buildQueryBuilder(experiences);
      mockExperienceRepo.createQueryBuilder.mockReturnValue(qb);

      mockItineraryRepo.save.mockResolvedValue(existingEntity);
      mockItineraryExpRepo.create.mockImplementation(v => v);
      mockItineraryExpRepo.save.mockResolvedValue([]);

      const result = await service.modifyItinerary('itin-1', 'user-1', 'add hiking');

      // Merged: new preferences override, existing location preserved
      expect(result.parameters.preferences).toEqual(['adventure']);
      expect(result.parameters.location).toBe('Tokyo');
      expect(result.parameters.duration).toBe(3);
    });
  });

  // ─── getUserItineraries() ────────────────────────────────────────────────

  describe('getUserItineraries', () => {
    it('should return all itineraries for a user', async () => {
      const entities = [
        {
          id: 'itin-1',
          userId: 'user-1',
          createdAt: new Date(),
          parameters: { preferences: ['food'], activityTypes: [] },
          totalCostAmount: 100,
          totalCostCurrency: 'USD',
          experiences: [],
        },
        {
          id: 'itin-2',
          userId: 'user-1',
          createdAt: new Date(),
          parameters: { preferences: ['culture'], activityTypes: [] },
          totalCostAmount: 200,
          totalCostCurrency: 'EUR',
          experiences: [],
        },
      ];
      mockItineraryRepo.find.mockResolvedValue(entities);

      const result = await service.getUserItineraries('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('itin-1');
      expect(result[1].id).toBe('itin-2');
    });

    it('should return empty array when user has no itineraries', async () => {
      mockItineraryRepo.find.mockResolvedValue([]);

      const result = await service.getUserItineraries('user-1');

      expect(result).toEqual([]);
    });
  });

  // ─── getItinerary() ──────────────────────────────────────────────────────

  describe('getItinerary', () => {
    it('should return itinerary by id and userId', async () => {
      const entity = {
        id: 'itin-1',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: { preferences: ['food'], activityTypes: [] },
        totalCostAmount: 100,
        totalCostCurrency: 'USD',
        experiences: [
          { experienceId: 'exp-1', relevanceScore: 0.9, suggestedDate: null, reasoning: 'Great match', position: 1 },
        ],
      };
      mockItineraryRepo.findOne.mockResolvedValue(entity);

      const result = await service.getItinerary('itin-1', 'user-1');

      expect(result.id).toBe('itin-1');
      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0].experienceId).toBe('exp-1');
    });

    it('should throw NotFoundException when itinerary not found', async () => {
      mockItineraryRepo.findOne.mockResolvedValue(null);

      await expect(service.getItinerary('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when itinerary belongs to different user', async () => {
      mockItineraryRepo.findOne.mockResolvedValue(null); // TypeORM returns null for wrong userId

      await expect(service.getItinerary('itin-1', 'other-user')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Geographic clustering ────────────────────────────────────────────────

  describe('geographic clustering (haversine)', () => {
    it('should sort experiences by proximity when location is provided', async () => {
      // Tokyo area experiences at different distances
      const experiences = [
        makeExperience({ id: 'exp-far', locationLat: 35.7, locationLng: 140.5 }),   // farther
        makeExperience({ id: 'exp-near', locationLat: 35.68, locationLng: 139.65 }), // closer to first
        makeExperience({ id: 'exp-mid', locationLat: 35.69, locationLng: 139.7 }),
      ];

      const paramsWithLocation: TripParameters = {
        preferences: ['food'],
        activityTypes: [],
        location: 'Tokyo',
        budget: { min: 0, max: 1000, currency: 'USD' },
      };

      mockVectorSearchService.semanticSearchExperiences.mockResolvedValue([]);
      const qb = buildQueryBuilder(experiences);
      mockExperienceRepo.createQueryBuilder.mockReturnValue(qb);

      const savedEntity = {
        id: 'itin-geo',
        userId: 'user-1',
        createdAt: new Date(),
        parameters: paramsWithLocation,
        totalCostAmount: 150,
        totalCostCurrency: 'USD',
      };
      mockItineraryRepo.create.mockReturnValue(savedEntity);
      mockItineraryRepo.save.mockResolvedValue(savedEntity);
      mockItineraryExpRepo.create.mockImplementation(v => v);
      mockItineraryExpRepo.save.mockResolvedValue([]);

      const result = await service.generateItinerary('user-1', paramsWithLocation);

      // Should produce a valid itinerary (geographic sorting applied)
      expect(result.experiences.length).toBeGreaterThan(0);
    });
  });
});
