import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VectorDatabaseService } from './vector-database.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly vectorDatabaseService: VectorDatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async getSimilarExperiences(
    experienceId: string,
    limit: number = 5,
  ): Promise<Array<{ experienceId: string; similarity: number }>> {
    const rows: Array<{ embedding: string }> = await this.dataSource.query(
      'SELECT embedding FROM experience_embeddings WHERE experience_id = $1',
      [experienceId],
    );

    if (!rows.length || !rows[0].embedding) {
      return [];
    }

    // Parse the embedding from postgres vector string format
    const embeddingStr = rows[0].embedding as string;
    const embedding: number[] = embeddingStr
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map(Number);

    const results = await this.vectorDatabaseService.searchSimilarExperiences(
      embedding,
      0.7,
      limit + 1,
    );

    return results
      .filter((r) => r.experienceId !== experienceId)
      .slice(0, limit);
  }

  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<Array<{ experienceId: string; similarity: number }>> {
    const rows: Array<{ embedding: string }> = await this.dataSource.query(
      'SELECT embedding FROM user_preference_embeddings WHERE user_id = $1',
      [userId],
    );

    if (!rows.length || !rows[0].embedding) {
      return [];
    }

    const embeddingStr = rows[0].embedding as string;
    const embedding: number[] = embeddingStr
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map(Number);

    return this.vectorDatabaseService.searchSimilarExperiences(
      embedding,
      0.5,
      limit,
    );
  }

  async updateUserPreferences(
    userId: string,
    bookedExperience: { title: string; description: string; category: string[] },
  ): Promise<void> {
    const newEmbedding = await this.embeddingService.generateExperienceEmbedding(bookedExperience);

    const rows: Array<{ embedding: string }> = await this.dataSource.query(
      'SELECT embedding FROM user_preference_embeddings WHERE user_id = $1',
      [userId],
    );

    let finalEmbedding: number[];

    if (rows.length && rows[0].embedding) {
      const existingStr = rows[0].embedding as string;
      const existing: number[] = existingStr
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .split(',')
        .map(Number);

      // Simple moving average
      finalEmbedding = existing.map((val, i) => (val + newEmbedding[i]) / 2);
    } else {
      finalEmbedding = newEmbedding;
    }

    await this.vectorDatabaseService.upsertUserPreferenceEmbedding(userId, finalEmbedding);
    this.logger.log(`Updated preference embedding for user ${userId}`);
  }
}
