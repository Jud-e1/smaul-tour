import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const VECTOR_DIMENSION = 1536;

@Injectable()
export class VectorDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(VectorDatabaseService.name);
  private pgvectorAvailable = false;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async ensureSchema(): Promise<void> {
    try {
      // Enable pgvector extension
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      this.pgvectorAvailable = true;
      this.logger.log('pgvector extension enabled');
    } catch (error) {
      this.logger.warn(
        `pgvector extension not available: ${(error as Error).message}. Vector search will be disabled.`
      );
      return;
    }

    try {
      // Create experience_embeddings table
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS experience_embeddings (
          experience_id UUID PRIMARY KEY,
          embedding vector(${VECTOR_DIMENSION}),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create user_preference_embeddings table
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS user_preference_embeddings (
          user_id UUID PRIMARY KEY,
          embedding vector(${VECTOR_DIMENSION}),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create ivfflat indexes for fast cosine similarity search
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS experience_embeddings_embedding_idx
        ON experience_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS user_preference_embeddings_embedding_idx
        ON user_preference_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      this.logger.log('Vector database schema initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize vector schema: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  async upsertExperienceEmbedding(experienceId: string, embedding: number[]): Promise<void> {
    if (!this.pgvectorAvailable) {
      this.logger.warn('pgvector not available, skipping upsertExperienceEmbedding');
      return;
    }

    await this.dataSource.query(
      `
      INSERT INTO experience_embeddings (experience_id, embedding, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (experience_id)
      DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
      `,
      [experienceId, `[${embedding.join(',')}]`]
    );
  }

  async upsertUserPreferenceEmbedding(userId: string, embedding: number[]): Promise<void> {
    if (!this.pgvectorAvailable) {
      this.logger.warn('pgvector not available, skipping upsertUserPreferenceEmbedding');
      return;
    }

    await this.dataSource.query(
      `
      INSERT INTO user_preference_embeddings (user_id, embedding, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
      `,
      [userId, `[${embedding.join(',')}]`]
    );
  }

  async searchSimilarExperiences(
    embedding: number[],
    threshold: number,
    limit: number
  ): Promise<Array<{ experienceId: string; similarity: number }>> {
    if (!this.pgvectorAvailable) {
      this.logger.warn('pgvector not available, returning empty results');
      return [];
    }

    const rows: Array<{ experience_id: string; similarity: number }> = await this.dataSource.query(
      `
        SELECT experience_id, 1 - (embedding <=> $1::vector) AS similarity
        FROM experience_embeddings
        WHERE 1 - (embedding <=> $1::vector) >= $2
        ORDER BY similarity DESC
        LIMIT $3
        `,
      [`[${embedding.join(',')}]`, threshold, limit]
    );

    return rows.map((row) => ({
      experienceId: row.experience_id,
      similarity: row.similarity,
    }));
  }

  async searchSimilarUserPreferences(
    userId: string,
    embedding: number[]
  ): Promise<Array<{ userId: string; similarity: number }>> {
    if (!this.pgvectorAvailable) {
      this.logger.warn('pgvector not available, returning empty results');
      return [];
    }

    const rows: Array<{ user_id: string; similarity: number }> = await this.dataSource.query(
      `
        SELECT user_id, 1 - (embedding <=> $1::vector) AS similarity
        FROM user_preference_embeddings
        WHERE user_id != $2
        ORDER BY similarity DESC
        LIMIT 10
        `,
      [`[${embedding.join(',')}]`, userId]
    );

    return rows.map((row) => ({
      userId: row.user_id,
      similarity: row.similarity,
    }));
  }

  async deleteExperienceEmbedding(experienceId: string): Promise<void> {
    if (!this.pgvectorAvailable) {
      this.logger.warn('pgvector not available, skipping deleteExperienceEmbedding');
      return;
    }

    await this.dataSource.query('DELETE FROM experience_embeddings WHERE experience_id = $1', [
      experienceId,
    ]);
  }
}
