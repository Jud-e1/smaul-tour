import {
  Injectable,
  NotFoundException,
  ConflictException,
  Optional,
  Logger,
} from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';
import { LocationService } from './location.service';
import { VectorSearchService } from '../vector/vector-search.service';
import { RecommendationService } from '../vector/recommendation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Experience, CancellationPolicy, ExperienceStatus } from '../database/entities/experience.entity';
import { Image } from '../database/entities/image.entity';
import { AvailabilitySlot, SlotStatus } from '../database/entities/availability-slot.entity';
import { Booking, BookingStatus } from '../database/entities/booking.entity';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { AvailabilitySlotDto as AvailabilitySlotInputDto } from './dto/availability-slot.dto';
import {
  ExperienceDto,
  ImageDto,
  AvailabilitySlotDto,
  AvailabilityCalendarDto,
  ExperienceSearchQuery,
  ExperienceSearchResult,
  MulterFile,
  UpdateExperienceDto,
} from './interfaces/experience.interfaces';

@Injectable()
export class ExperienceService {
  private readonly logger = new Logger(ExperienceService.name);

  constructor(
    @InjectRepository(Experience) private experienceRepo: Repository<Experience>,
    @InjectRepository(Image) private imageRepo: Repository<Image>,
    @InjectRepository(AvailabilitySlot) private slotRepo: Repository<AvailabilitySlot>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    private imageStorageService: ImageStorageService,
    private locationService: LocationService,
    @Optional() private readonly vectorSearchService?: VectorSearchService,
    @Optional() private readonly recommendationService?: RecommendationService,
  ) {}

  async createExperience(guideId: string, dto: CreateExperienceDto): Promise<ExperienceDto> {
    const experience = this.experienceRepo.create({
      guideId,
      title: dto.title,
      description: dto.description,
      locationAddress: dto.locationAddress,
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      durationHours: dto.durationHours,
      priceAmount: dto.priceAmount,
      priceCurrency: dto.priceCurrency,
      category: dto.category,
      cancellationPolicy: (dto.cancellationPolicy ?? 'moderate') as CancellationPolicy,
      status: ExperienceStatus.PENDING_APPROVAL,
    });

    const saved = await this.experienceRepo.save(experience);
    saved.images = [];
    saved.availabilitySlots = [];

    this.vectorSearchService
      ?.indexExperience({ id: saved.id, title: saved.title, description: saved.description, category: saved.category })
      .catch(err => this.logger.warn(`Failed to index experience ${saved.id}: ${(err as Error).message}`));

    return this.mapToDto(saved);
  }

  async updateExperience(id: string, guideId: string, dto: UpdateExperienceDto): Promise<ExperienceDto> {
    const experience = await this.experienceRepo.findOne({
      where: { id, guideId },
      relations: ['images', 'availabilitySlots'],
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    if (dto.title !== undefined) experience.title = dto.title;
    if (dto.description !== undefined) experience.description = dto.description;
    if (dto.locationAddress !== undefined) experience.locationAddress = dto.locationAddress;
    if (dto.locationLat !== undefined) experience.locationLat = dto.locationLat;
    if (dto.locationLng !== undefined) experience.locationLng = dto.locationLng;
    if (dto.durationHours !== undefined) experience.durationHours = dto.durationHours;
    if (dto.priceAmount !== undefined) experience.priceAmount = dto.priceAmount;
    if (dto.priceCurrency !== undefined) experience.priceCurrency = dto.priceCurrency;
    if (dto.category !== undefined) experience.category = dto.category;
    if (dto.cancellationPolicy !== undefined) {
      experience.cancellationPolicy = dto.cancellationPolicy as CancellationPolicy;
    }
    if (dto.status !== undefined) {
      experience.status = dto.status as ExperienceStatus;
    }

    const saved = await this.experienceRepo.save(experience);

    if (dto.title !== undefined || dto.description !== undefined || dto.category !== undefined) {
      this.vectorSearchService
        ?.indexExperience({ id: saved.id, title: saved.title, description: saved.description, category: saved.category })
        .catch(err => this.logger.warn(`Failed to re-index experience ${saved.id}: ${(err as Error).message}`));
    }

    return this.mapToDto(saved);
  }

  async deleteExperience(id: string, guideId: string): Promise<void> {
    const experience = await this.experienceRepo.findOne({ where: { id, guideId } });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    const activeBookings = await this.bookingRepo.count({
      where: {
        experienceId: id,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
      },
    });

    if (activeBookings > 0) {
      throw new ConflictException('Cannot delete experience with active bookings');
    }

    await this.experienceRepo.delete(id);

    this.vectorSearchService
      ?.removeExperienceIndex(id)
      .catch(err => this.logger.warn(`Failed to remove index for experience ${id}: ${(err as Error).message}`));
  }

  async getExperience(id: string): Promise<ExperienceDto> {
    const experience = await this.experienceRepo.findOne({
      where: { id },
      relations: ['images', 'availabilitySlots'],
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    return this.mapToDto(experience);
  }

  async uploadImage(experienceId: string, guideId: string, file: MulterFile): Promise<ImageDto> {
    const experience = await this.experienceRepo.findOne({
      where: { id: experienceId, guideId },
      relations: ['images'],
    });
    if (!experience) throw new NotFoundException('Experience not found');

    if (experience.images.length >= 10) {
      throw new ConflictException('Maximum 10 images per experience');
    }

    this.imageStorageService.validateFile(file);

    const filename = this.imageStorageService.generateFilename(file.originalname, file.mimetype);
    const { url, thumbnailUrl, mediumUrl } = await this.imageStorageService.processAndUpload(file, filename);

    const image = this.imageRepo.create({
      experienceId,
      url,
      thumbnailUrl,
      mediumUrl,
      originalFilename: file.originalname,
      sizeBytes: file.size,
    });
    const saved = await this.imageRepo.save(image);

    if (!experience.primaryImageId) {
      experience.primaryImageId = saved.id;
      await this.experienceRepo.save(experience);
    }

    return {
      id: saved.id,
      url: saved.url,
      thumbnailUrl: saved.thumbnailUrl,
      mediumUrl: saved.mediumUrl,
      originalFilename: saved.originalFilename,
      sizeBytes: saved.sizeBytes,
    };
  }

  async setPrimaryImage(experienceId: string, guideId: string, imageId: string): Promise<void> {
    const experience = await this.experienceRepo.findOne({ where: { id: experienceId, guideId } });
    if (!experience) throw new NotFoundException('Experience not found');

    const image = await this.imageRepo.findOne({ where: { id: imageId, experienceId } });
    if (!image) throw new NotFoundException('Image not found');

    experience.primaryImageId = imageId;
    await this.experienceRepo.save(experience);
  }

  async updateAvailability(
    experienceId: string,
    guideId: string,
    slots: AvailabilitySlotInputDto[],
  ): Promise<AvailabilityCalendarDto> {
    const experience = await this.experienceRepo.findOne({ where: { id: experienceId, guideId } });
    if (!experience) throw new NotFoundException('Experience not found');

    await this.slotRepo.upsert(
      slots.map(s => ({
        experienceId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        status: SlotStatus.AVAILABLE,
      })),
      { conflictPaths: ['experienceId', 'date', 'startTime'], skipUpdateIfNoValuesChanged: true },
    );

    return this.getAvailability(experienceId);
  }

  async getAvailability(experienceId: string): Promise<AvailabilityCalendarDto> {
    const slots = await this.slotRepo.find({
      where: { experienceId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    return {
      experienceId,
      slots: slots.map((slot: AvailabilitySlot) => ({
        id: slot.id,
        date: slot.date instanceof Date ? slot.date.toISOString().split('T')[0] : String(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        booked: slot.booked,
        status: slot.status as 'available' | 'booked' | 'blocked',
      })),
    };
  }

  async searchExperiences(query: ExperienceSearchQuery): Promise<ExperienceSearchResult> {
    const qb = this.experienceRepo.createQueryBuilder('exp')
      .leftJoinAndSelect('exp.images', 'images')
      .where('exp.status = :status', { status: ExperienceStatus.ACTIVE });

    // Text search on title and description
    if (query.text) {
      qb.andWhere(
        '(LOWER(exp.title) LIKE :text OR LOWER(exp.description) LIKE :text)',
        { text: `%${query.text.toLowerCase()}%` }
      );
    }

    // Category filter (array overlap)
    if (query.categories && query.categories.length > 0) {
      qb.andWhere('exp.category && :categories', { categories: query.categories });
    }

    // Price range filter
    if (query.priceRange?.min !== undefined) {
      qb.andWhere('exp.priceAmount >= :minPrice', { minPrice: query.priceRange.min });
    }
    if (query.priceRange?.max !== undefined) {
      qb.andWhere('exp.priceAmount <= :maxPrice', { maxPrice: query.priceRange.max });
    }

    // Duration range filter
    if (query.durationRange?.min !== undefined) {
      qb.andWhere('exp.durationHours >= :minDuration', { minDuration: query.durationRange.min });
    }
    if (query.durationRange?.max !== undefined) {
      qb.andWhere('exp.durationHours <= :maxDuration', { maxDuration: query.durationRange.max });
    }

    // Minimum rating filter
    if (query.minRating !== undefined) {
      qb.andWhere('exp.averageRating >= :minRating', { minRating: query.minRating });
    }

    // Location radius filter (bounding box using Haversine approximation)
    if (query.location) {
      const { lat, lng, radiusKm } = query.location;
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
      qb.andWhere(
        'exp.locationLat BETWEEN :minLat AND :maxLat AND exp.locationLng BETWEEN :minLng AND :maxLng',
        {
          minLat: lat - latDelta,
          maxLat: lat + latDelta,
          minLng: lng - lngDelta,
          maxLng: lng + lngDelta,
        }
      );
    }

    // Sorting
    const sortField = query.sortBy === 'price' ? 'exp.priceAmount'
      : query.sortBy === 'rating' ? 'exp.averageRating'
      : 'exp.reviewCount'; // popularity = review count
    const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder);

    // Pagination
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [experiences, total] = await qb.getManyAndCount();

    return {
      experiences: experiences.map(e => this.mapToDto(e)),
      total,
      page,
      pageSize,
    };
  }

  async getRecommendations(experienceId: string, limit: number = 5): Promise<ExperienceDto[]> {
    const experience = await this.experienceRepo.findOne({ where: { id: experienceId } });
    if (!experience) throw new NotFoundException('Experience not found');

    if (this.recommendationService) {
      const similar = await this.recommendationService.getSimilarExperiences(experienceId, limit);
      const dtos = await Promise.all(
        similar.map(({ experienceId: eid }) =>
          this.experienceRepo.findOne({ where: { id: eid }, relations: ['images', 'availabilitySlots'] }),
        ),
      );
      return dtos.filter((e): e is Experience => e !== null).map(e => this.mapToDto(e));
    }

    // Fallback: category-based matching
    const similar = await this.experienceRepo.createQueryBuilder('exp')
      .leftJoinAndSelect('exp.images', 'images')
      .where('exp.id != :id', { id: experienceId })
      .andWhere('exp.status = :status', { status: ExperienceStatus.ACTIVE })
      .andWhere('exp.category && :categories', { categories: experience.category })
      .orderBy('exp.averageRating', 'DESC')
      .take(limit)
      .getMany();

    return similar.map(e => this.mapToDto(e));
  }

  async getPersonalizedRecommendations(userId: string, limit: number = 10): Promise<ExperienceDto[]> {
    if (!this.recommendationService) {
      return [];
    }

    const results = await this.recommendationService.getPersonalizedRecommendations(userId, limit);
    const dtos = await Promise.all(
      results.map(({ experienceId }) =>
        this.experienceRepo.findOne({ where: { id: experienceId }, relations: ['images', 'availabilitySlots'] }),
      ),
    );
    return dtos.filter((e): e is Experience => e !== null).map(e => this.mapToDto(e));
  }

  async calculateTravelTimes(
    locations: Array<{ id: string; lat: number; lng: number }>,
  ) {
    return this.locationService.calculateTravelTimes(locations);
  }

  mapToDto(experience: Experience): ExperienceDto {
    const images: ImageDto[] = (experience.images ?? []).map(img => ({
      id: img.id,
      url: img.url,
      thumbnailUrl: img.thumbnailUrl,
      mediumUrl: img.mediumUrl,
      originalFilename: img.originalFilename,
      sizeBytes: img.sizeBytes,
    }));

    const slots: AvailabilitySlotDto[] = (experience.availabilitySlots ?? []).map(slot => ({
      id: slot.id,
      date: slot.date instanceof Date ? slot.date.toISOString().split('T')[0] : String(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      booked: slot.booked,
      status: slot.status as 'available' | 'booked' | 'blocked',
    }));

    const availability: AvailabilityCalendarDto = {
      experienceId: experience.id,
      slots,
    };

    return {
      id: experience.id,
      guideId: experience.guideId,
      title: experience.title,
      description: experience.description,
      location: {
        address: experience.locationAddress,
        latitude: Number(experience.locationLat),
        longitude: Number(experience.locationLng),
      },
      durationHours: Number(experience.durationHours),
      price: {
        amount: Number(experience.priceAmount),
        currency: experience.priceCurrency,
      },
      category: experience.category,
      images,
      primaryImageId: experience.primaryImageId ?? undefined,
      availability,
      status: experience.status as 'active' | 'inactive' | 'pending_approval',
      averageRating: Number(experience.averageRating),
      reviewCount: experience.reviewCount,
      cancellationPolicy: experience.cancellationPolicy as 'flexible' | 'moderate' | 'strict',
      createdAt: experience.createdAt,
      updatedAt: experience.updatedAt,
    };
  }
}
