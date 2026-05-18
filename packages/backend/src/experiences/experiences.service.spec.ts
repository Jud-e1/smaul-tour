import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ExperienceService } from './experiences.service';
import { ImageStorageService } from './image-storage.service';
import { LocationService } from './location.service';
import { Experience, ExperienceStatus } from '../database/entities/experience.entity';
import { Image } from '../database/entities/image.entity';
import { AvailabilitySlot } from '../database/entities/availability-slot.entity';
import { Booking } from '../database/entities/booking.entity';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 'exp-uuid-1',
    guideId: 'guide-uuid-1',
    title: 'City Walking Tour',
    description: 'A great tour',
    locationAddress: '123 Main St',
    locationLat: 40.7128,
    locationLng: -74.006,
    durationHours: 2,
    priceAmount: 50,
    priceCurrency: 'USD',
    category: ['walking', 'culture'],
    primaryImageId: null,
    status: ExperienceStatus.PENDING_APPROVAL,
    averageRating: 0,
    reviewCount: 0,
    cancellationPolicy: 'moderate' as any,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    images: [],
    availabilitySlots: [],
    bookings: [],
    reviews: [],
    guide: null,
    ...overrides,
  } as Experience;
}

function makeImage(overrides: Partial<Image> = {}): Image {
  return {
    id: 'img-uuid-1',
    experienceId: 'exp-uuid-1',
    url: 'https://storage.example.com/images/test.jpg',
    thumbnailUrl: 'https://storage.example.com/images/thumb_test.jpg',
    mediumUrl: 'https://storage.example.com/images/medium_test.jpg',
    originalFilename: 'test.jpg',
    sizeBytes: 1024,
    uploadedAt: new Date('2024-01-01'),
    experience: null,
    ...overrides,
  } as Image;
}

// ─── Mock QueryBuilder ───────────────────────────────────────────────────────

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getMany: jest.fn().mockResolvedValue([]),
};

const mockExperienceRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockImageRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockSlotRepo = {
  find: jest.fn(),
  upsert: jest.fn(),
};

const mockBookingRepo = {
  count: jest.fn(),
};

const mockImageStorageService = {
  validateFile: jest.fn(),
  generateFilename: jest.fn().mockReturnValue('generated-uuid.jpg'),
  processAndUpload: jest.fn().mockResolvedValue({
    url: 'https://storage.example.com/images/generated-uuid.jpg',
    thumbnailUrl: 'https://storage.example.com/images/thumb_generated-uuid.jpg',
    mediumUrl: 'https://storage.example.com/images/medium_generated-uuid.jpg',
  }),
};

const mockLocationService = {
  calculateTravelTimes: jest.fn(),
};

// ─── ExperienceService ───────────────────────────────────────────────────────

describe('ExperienceService', () => {
  let service: ExperienceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceService,
        { provide: getRepositoryToken(Experience), useValue: mockExperienceRepo },
        { provide: getRepositoryToken(Image), useValue: mockImageRepo },
        { provide: getRepositoryToken(AvailabilitySlot), useValue: mockSlotRepo },
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: ImageStorageService, useValue: mockImageStorageService },
        { provide: LocationService, useValue: mockLocationService },
      ],
    }).compile();

    service = module.get<ExperienceService>(ExperienceService);
    jest.clearAllMocks();
    // Re-apply default mock implementations after clearAllMocks
    mockExperienceRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockImageStorageService.generateFilename.mockReturnValue('generated-uuid.jpg');
    mockImageStorageService.processAndUpload.mockResolvedValue({
      url: 'https://storage.example.com/images/generated-uuid.jpg',
      thumbnailUrl: 'https://storage.example.com/images/thumb_generated-uuid.jpg',
      mediumUrl: 'https://storage.example.com/images/medium_generated-uuid.jpg',
    });
  });

  // ─── createExperience() ───────────────────────────────────────────────────

  describe('createExperience', () => {
    const dto = {
      title: 'City Tour',
      description: 'A great tour',
      locationAddress: '123 Main St',
      locationLat: 40.7128,
      locationLng: -74.006,
      durationHours: 2,
      priceAmount: 50,
      priceCurrency: 'USD',
      category: ['walking'],
    };

    it('should create and return an experience DTO', async () => {
      const exp = makeExperience({ status: ExperienceStatus.PENDING_APPROVAL });
      mockExperienceRepo.create.mockReturnValue(exp);
      mockExperienceRepo.save.mockResolvedValue(exp);

      const result = await service.createExperience('guide-uuid-1', dto as any);

      expect(result.id).toBe(exp.id);
      expect(result.guideId).toBe('guide-uuid-1');
      expect(mockExperienceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should set status to PENDING_APPROVAL', async () => {
      const exp = makeExperience({ status: ExperienceStatus.PENDING_APPROVAL });
      mockExperienceRepo.create.mockReturnValue(exp);
      mockExperienceRepo.save.mockResolvedValue(exp);

      const result = await service.createExperience('guide-uuid-1', dto as any);

      expect(result.status).toBe('pending_approval');
      const createdArg = mockExperienceRepo.create.mock.calls[0][0];
      expect(createdArg.status).toBe(ExperienceStatus.PENDING_APPROVAL);
    });
  });

  // ─── updateExperience() ───────────────────────────────────────────────────

  describe('updateExperience', () => {
    it('should update and return the updated experience', async () => {
      const exp = makeExperience({ images: [], availabilitySlots: [] });
      mockExperienceRepo.findOne.mockResolvedValue(exp);
      const updated = makeExperience({ title: 'Updated Title', images: [], availabilitySlots: [] });
      mockExperienceRepo.save.mockResolvedValue(updated);

      const result = await service.updateExperience('exp-uuid-1', 'guide-uuid-1', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(mockExperienceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when experience not found or not owned by guide', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateExperience('exp-uuid-1', 'wrong-guide', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteExperience() ───────────────────────────────────────────────────

  describe('deleteExperience', () => {
    it('should delete experience when no active bookings exist', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(makeExperience());
      mockBookingRepo.count.mockResolvedValue(0);
      mockExperienceRepo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteExperience('exp-uuid-1', 'guide-uuid-1')).resolves.toBeUndefined();
      expect(mockExperienceRepo.delete).toHaveBeenCalledWith('exp-uuid-1');
    });

    it('should throw NotFoundException when experience not found', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteExperience('exp-uuid-1', 'guide-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when active bookings exist', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(makeExperience());
      mockBookingRepo.count.mockResolvedValue(2);

      await expect(service.deleteExperience('exp-uuid-1', 'guide-uuid-1')).rejects.toThrow(ConflictException);
    });
  });

  // ─── getExperience() ──────────────────────────────────────────────────────

  describe('getExperience', () => {
    it('should return experience DTO with images and slots', async () => {
      const img = makeImage();
      const exp = makeExperience({ images: [img], availabilitySlots: [] });
      mockExperienceRepo.findOne.mockResolvedValue(exp);

      const result = await service.getExperience('exp-uuid-1');

      expect(result.id).toBe('exp-uuid-1');
      expect(result.images).toHaveLength(1);
      expect(result.images[0].id).toBe('img-uuid-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(null);

      await expect(service.getExperience('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── searchExperiences() ──────────────────────────────────────────────────

  describe('searchExperiences', () => {
    const baseQuery = { page: 1, pageSize: 10 };

    it('should call createQueryBuilder and return paginated results', async () => {
      const exp = makeExperience({ status: ExperienceStatus.ACTIVE, images: [], availabilitySlots: [] });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[exp], 1]);

      const result = await service.searchExperiences(baseQuery as any);

      expect(mockExperienceRepo.createQueryBuilder).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.experiences).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should apply text filter when query.text is provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchExperiences({ ...baseQuery, text: 'walking' } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(exp.title)'),
        expect.objectContaining({ text: '%walking%' }),
      );
    });

    it('should only return ACTIVE experiences', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchExperiences(baseQuery as any);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'exp.status = :status',
        { status: ExperienceStatus.ACTIVE },
      );
    });
  });

  // ─── uploadImage() ────────────────────────────────────────────────────────

  describe('uploadImage', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from(''),
    };

    it('should throw NotFoundException when experience not found', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.uploadImage('exp-uuid-1', 'guide-uuid-1', mockFile as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when experience already has 10 images', async () => {
      const images = Array.from({ length: 10 }, (_, i) => makeImage({ id: `img-${i}` }));
      mockExperienceRepo.findOne.mockResolvedValue(makeExperience({ images }));

      await expect(
        service.uploadImage('exp-uuid-1', 'guide-uuid-1', mockFile as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should call imageStorageService.validateFile', async () => {
      const exp = makeExperience({ images: [] });
      mockExperienceRepo.findOne.mockResolvedValue(exp);
      const savedImage = makeImage();
      mockImageRepo.create.mockReturnValue(savedImage);
      mockImageRepo.save.mockResolvedValue(savedImage);
      mockExperienceRepo.save.mockResolvedValue(exp);

      await service.uploadImage('exp-uuid-1', 'guide-uuid-1', mockFile as any);

      expect(mockImageStorageService.validateFile).toHaveBeenCalledWith(mockFile);
    });

    it('should save image and return ImageDto', async () => {
      const exp = makeExperience({ images: [] });
      mockExperienceRepo.findOne.mockResolvedValue(exp);
      const savedImage = makeImage();
      mockImageRepo.create.mockReturnValue(savedImage);
      mockImageRepo.save.mockResolvedValue(savedImage);
      mockExperienceRepo.save.mockResolvedValue(exp);

      const result = await service.uploadImage('exp-uuid-1', 'guide-uuid-1', mockFile as any);

      expect(result.id).toBe('img-uuid-1');
      expect(result.url).toContain('storage.example.com');
      expect(mockImageRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should set primaryImageId when uploading first image', async () => {
      const exp = makeExperience({ images: [], primaryImageId: undefined as any });
      mockExperienceRepo.findOne.mockResolvedValue(exp);
      const savedImage = makeImage({ id: 'first-img-id' });
      mockImageRepo.create.mockReturnValue(savedImage);
      mockImageRepo.save.mockResolvedValue(savedImage);
      mockExperienceRepo.save.mockResolvedValue(exp);

      await service.uploadImage('exp-uuid-1', 'guide-uuid-1', mockFile as any);

      expect(mockExperienceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ primaryImageId: 'first-img-id' }),
      );
    });
  });

  // ─── updateAvailability() ─────────────────────────────────────────────────

  describe('updateAvailability', () => {
    const slots = [
      { date: '2024-07-15', startTime: '09:00', endTime: '11:00', capacity: 10 },
    ];

    it('should throw NotFoundException when experience not found', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAvailability('exp-uuid-1', 'guide-uuid-1', slots as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call slotRepo.upsert with correct data', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(makeExperience());
      mockSlotRepo.upsert.mockResolvedValue(undefined);
      mockSlotRepo.find.mockResolvedValue([]);

      await service.updateAvailability('exp-uuid-1', 'guide-uuid-1', slots as any);

      expect(mockSlotRepo.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            experienceId: 'exp-uuid-1',
            date: '2024-07-15',
            startTime: '09:00',
            endTime: '11:00',
            capacity: 10,
          }),
        ]),
        expect.objectContaining({ conflictPaths: ['experienceId', 'date', 'startTime'] }),
      );
    });

    it('should return AvailabilityCalendarDto', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(makeExperience());
      mockSlotRepo.upsert.mockResolvedValue(undefined);
      mockSlotRepo.find.mockResolvedValue([]);

      const result = await service.updateAvailability('exp-uuid-1', 'guide-uuid-1', slots as any);

      expect(result.experienceId).toBe('exp-uuid-1');
      expect(Array.isArray(result.slots)).toBe(true);
    });
  });

  // ─── getRecommendations() ─────────────────────────────────────────────────

  describe('getRecommendations', () => {
    it('should throw NotFoundException when experience not found', async () => {
      mockExperienceRepo.findOne.mockResolvedValue(null);

      await expect(service.getRecommendations('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return similar experiences from same category', async () => {
      const exp = makeExperience({ category: ['walking'] });
      mockExperienceRepo.findOne.mockResolvedValue(exp);
      const similar = makeExperience({
        id: 'exp-uuid-2',
        status: ExperienceStatus.ACTIVE,
        images: [],
        availabilitySlots: [],
      });
      mockQueryBuilder.getMany.mockResolvedValue([similar]);

      const result = await service.getRecommendations('exp-uuid-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe('exp-uuid-2');
    });
  });
});
