import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Itinerary as ItineraryEntity } from '../database/entities/itinerary.entity';
import { ItineraryExperience } from '../database/entities/itinerary-experience.entity';
import { Experience } from '../database/entities/experience.entity';
import { VectorSearchService } from '../vector/vector-search.service';
import { LlmParserService } from './llm-parser.service';
import {
  TripRequest,
  TripParameters,
  Itinerary,
  ExperienceRecommendation,
} from './interfaces/trip-planner.interfaces';
import { ItineraryNotificationsService } from '../notifications/itinerary-notifications.service';

@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepo: Repository<ItineraryEntity>,
    @InjectRepository(ItineraryExperience)
    private readonly itineraryExpRepo: Repository<ItineraryExperience>,
    @InjectRepository(Experience)
    private readonly experienceRepo: Repository<Experience>,
    private readonly vectorSearchService: VectorSearchService,
    private readonly llmParserService: LlmParserService,
    @Optional() private readonly itineraryNotificationsService: ItineraryNotificationsService | null
  ) {}

  async parseRequest(request: TripRequest): Promise<TripParameters> {
    return this.llmParserService.parseTripRequest(request.naturalLanguageInput);
  }

  async generateItinerary(userId: string, params: TripParameters): Promise<Itinerary> {
    const experiences = await this.findMatchingExperiences(params);

    const recommendations = this.buildRecommendations(experiences, params);

    const totalCost = this.calculateTotalCost(
      recommendations,
      experiences,
      params.budget?.currency ?? 'USD'
    );

    const entity = this.itineraryRepo.create({
      userId,
      parameters: params as unknown as Record<string, unknown>,
      totalCostAmount: totalCost.amount,
      totalCostCurrency: totalCost.currency,
    });
    const saved = await this.itineraryRepo.save(entity);

    if (recommendations.length > 0) {
      const expEntities = recommendations.map((rec, idx) =>
        this.itineraryExpRepo.create({
          itineraryId: saved.id,
          experienceId: rec.experienceId,
          relevanceScore: rec.relevanceScore,
          suggestedDate: rec.suggestedDate,
          reasoning: rec.reasoning,
          position: idx + 1,
        })
      );
      await this.itineraryExpRepo.save(expEntities);
    }

    // Send itinerary generated notification (fire-and-forget)
    if (this.itineraryNotificationsService) {
      this.itineraryNotificationsService
        .sendItineraryGenerated({
          itineraryId: saved.id,
          userId,
          experienceCount: recommendations.length,
          totalCost: totalCost.amount,
          currency: totalCost.currency,
        })
        .catch((err) =>
          this.logger.warn(`Itinerary notification failed: ${(err as Error).message}`)
        );
    }

    return {
      id: saved.id,
      userId,
      generatedAt: saved.createdAt,
      experiences: recommendations,
      totalCost,
      parameters: params,
    };
  }

  async modifyItinerary(
    itineraryId: string,
    userId: string,
    modification: string
  ): Promise<Itinerary> {
    const existing = await this.itineraryRepo.findOne({
      where: { id: itineraryId, userId },
      relations: ['experiences'],
    });

    if (!existing) {
      throw new NotFoundException('Itinerary not found');
    }

    const existingParams = existing.parameters as unknown as TripParameters;

    // Parse the modification as a new trip request and merge with existing params
    const modParams = await this.llmParserService.parseTripRequest(modification);
    const mergedParams: TripParameters = {
      ...existingParams,
      preferences:
        modParams.preferences.length > 0 ? modParams.preferences : existingParams.preferences,
      activityTypes:
        modParams.activityTypes.length > 0 ? modParams.activityTypes : existingParams.activityTypes,
      ...(modParams.duration && { duration: modParams.duration }),
      ...(modParams.budget && { budget: modParams.budget }),
      ...(modParams.location && { location: modParams.location }),
      ...(modParams.dates && { dates: modParams.dates }),
    };

    // Remove old itinerary experiences and regenerate
    await this.itineraryExpRepo.delete({ itineraryId });

    const experiences = await this.findMatchingExperiences(mergedParams);
    const recommendations = this.buildRecommendations(experiences, mergedParams);
    const totalCost = this.calculateTotalCost(
      recommendations,
      experiences,
      mergedParams.budget?.currency ?? 'USD'
    );

    existing.parameters = mergedParams as unknown as Record<string, unknown>;
    existing.totalCostAmount = totalCost.amount;
    existing.totalCostCurrency = totalCost.currency;
    await this.itineraryRepo.save(existing);

    if (recommendations.length > 0) {
      const expEntities = recommendations.map((rec, idx) =>
        this.itineraryExpRepo.create({
          itineraryId,
          experienceId: rec.experienceId,
          relevanceScore: rec.relevanceScore,
          suggestedDate: rec.suggestedDate,
          reasoning: rec.reasoning,
          position: idx + 1,
        })
      );
      await this.itineraryExpRepo.save(expEntities);
    }

    return {
      id: itineraryId,
      userId,
      generatedAt: existing.createdAt,
      experiences: recommendations,
      totalCost,
      parameters: mergedParams,
    };
  }

  async saveItinerary(itinerary: Itinerary): Promise<void> {
    await this.itineraryRepo.update(itinerary.id, {
      parameters: itinerary.parameters as unknown as Record<string, any>,
      totalCostAmount: itinerary.totalCost.amount,
      totalCostCurrency: itinerary.totalCost.currency,
    });
  }

  async getUserItineraries(userId: string): Promise<Itinerary[]> {
    const entities = await this.itineraryRepo.find({
      where: { userId },
      relations: ['experiences'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(entities.map((e: ItineraryEntity) => this.mapEntityToItinerary(e)));
  }

  async getItinerary(id: string, userId: string): Promise<Itinerary> {
    const entity = await this.itineraryRepo.findOne({
      where: { id, userId },
      relations: ['experiences'],
    });

    if (!entity) {
      throw new NotFoundException('Itinerary not found');
    }

    return this.mapEntityToItinerary(entity);
  }

  private async findMatchingExperiences(params: TripParameters): Promise<Experience[]> {
    const searchTerms = [
      ...(params.preferences ?? []),
      ...(params.activityTypes ?? []),
      params.location ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    let vectorResults: Array<{ experienceId: string; similarity: number }> = [];

    if (searchTerms.trim()) {
      try {
        vectorResults = await this.vectorSearchService.semanticSearchExperiences(
          searchTerms,
          0.5,
          20
        );
      } catch (err) {
        this.logger.warn(
          `Vector search failed, falling back to DB search: ${(err as Error).message}`
        );
      }
    }

    let experiences: Experience[] = [];

    if (vectorResults.length > 0) {
      const ids = vectorResults.map((r) => r.experienceId);
      experiences = await this.experienceRepo
        .createQueryBuilder('exp')
        .where('exp.id IN (:...ids)', { ids })
        .andWhere('exp.status = :status', { status: 'active' })
        .getMany();
    } else {
      // Fallback: fetch active experiences filtered by category
      const qb = this.experienceRepo
        .createQueryBuilder('exp')
        .where('exp.status = :status', { status: 'active' });

      if (params.activityTypes?.length) {
        qb.andWhere('exp.category && :cats', { cats: params.activityTypes });
      }

      experiences = await qb.orderBy('exp.averageRating', 'DESC').take(20).getMany();
    }

    // Apply budget filter
    if (params.budget) {
      experiences = experiences.filter(
        (e) =>
          Number(e.priceAmount) >= params.budget!.min && Number(e.priceAmount) <= params.budget!.max
      );
    }

    // Sort by geographic proximity if location coordinates are available
    if (params.location) {
      experiences = this.sortByGeographicClustering(experiences);
    }

    return experiences;
  }

  private sortByGeographicClustering(experiences: Experience[]): Experience[] {
    if (experiences.length <= 1) return experiences;

    // Greedy nearest-neighbor clustering starting from the first experience
    const sorted: Experience[] = [experiences[0]];
    const remaining = experiences.slice(1);

    while (remaining.length > 0) {
      const last = sorted[sorted.length - 1];
      let nearestIdx = 0;
      let minDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.haversineKm(
          Number(last.locationLat),
          Number(last.locationLng),
          Number(remaining[i].locationLat),
          Number(remaining[i].locationLng)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      sorted.push(remaining[nearestIdx]);
      remaining.splice(nearestIdx, 1);
    }

    return sorted;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private buildRecommendations(
    experiences: Experience[],
    params: TripParameters
  ): ExperienceRecommendation[] {
    const maxExperiences = Math.max(3, (params.duration ?? 1) * 2);
    const selected = experiences.slice(0, maxExperiences);

    return selected.map((exp, idx) => {
      const suggestedDate = params.dates?.start
        ? new Date(new Date(params.dates.start).getTime() + idx * 24 * 60 * 60 * 1000)
        : undefined;

      const matchedPrefs = [...(params.preferences ?? []), ...(params.activityTypes ?? [])].filter(
        (p) =>
          exp.category.some((c) => c.toLowerCase().includes(p.toLowerCase())) ||
          exp.title.toLowerCase().includes(p.toLowerCase())
      );

      const reasoning =
        matchedPrefs.length > 0
          ? `Matches your interest in ${matchedPrefs.join(', ')}`
          : `Highly rated ${exp.category[0] ?? 'experience'} in the area`;

      return {
        experienceId: exp.id,
        relevanceScore: Math.min(0.95, 0.6 + matchedPrefs.length * 0.1),
        suggestedDate,
        reasoning,
      };
    });
  }

  private calculateTotalCost(
    recommendations: ExperienceRecommendation[],
    experiences: Experience[],
    currency: string
  ): { amount: number; currency: string } {
    const expMap = new Map(experiences.map((e) => [e.id, e]));
    const total = recommendations.reduce((sum, rec) => {
      const exp = expMap.get(rec.experienceId);
      return sum + (exp ? Number(exp.priceAmount) : 0);
    }, 0);

    return { amount: Math.round(total * 100) / 100, currency };
  }

  private async mapEntityToItinerary(entity: ItineraryEntity): Promise<Itinerary> {
    const itineraryExps = entity.experiences ?? [];

    const recommendations: ExperienceRecommendation[] = itineraryExps
      .sort((a, b) => a.position - b.position)
      .map((ie) => ({
        experienceId: ie.experienceId,
        relevanceScore: Number(ie.relevanceScore ?? 0),
        suggestedDate: ie.suggestedDate ?? undefined,
        reasoning: ie.reasoning ?? '',
      }));

    return {
      id: entity.id,
      userId: entity.userId,
      generatedAt: entity.createdAt,
      experiences: recommendations,
      totalCost: {
        amount: Number(entity.totalCostAmount ?? 0),
        currency: entity.totalCostCurrency ?? 'USD',
      },
      parameters: entity.parameters as unknown as TripParameters,
    };
  }
}
