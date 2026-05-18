import { Injectable } from '@nestjs/common';
import { VectorDatabaseService } from './vector-database.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class VectorSearchService {
  constructor(
    private readonly vectorDatabaseService: VectorDatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async semanticSearchExperiences(
    query: string,
    threshold: number = 0.7,
    limit: number = 10,
  ): Promise<Array<{ experienceId: string; similarity: number }>> {
    const embedding = await this.embeddingService.generateEmbedding(query);
    return this.vectorDatabaseService.searchSimilarExperiences(embedding, threshold, limit);
  }

  async indexExperience(experience: {
    id: string;
    title: string;
    description: string;
    category: string[];
  }): Promise<void> {
    const embedding = await this.embeddingService.generateExperienceEmbedding(experience);
    await this.vectorDatabaseService.upsertExperienceEmbedding(experience.id, embedding);
  }

  async removeExperienceIndex(experienceId: string): Promise<void> {
    await this.vectorDatabaseService.deleteExperienceEmbedding(experienceId);
  }
}
