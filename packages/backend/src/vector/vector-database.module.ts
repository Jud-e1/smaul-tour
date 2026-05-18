import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { VectorDatabaseService } from './vector-database.service';
import { EmbeddingService } from './embedding.service';
import { VectorSearchService } from './vector-search.service';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    CacheModule.register({ ttl: 3600, max: 1000 }),
  ],
  providers: [VectorDatabaseService, EmbeddingService, VectorSearchService, RecommendationService],
  exports: [VectorDatabaseService, EmbeddingService, VectorSearchService, RecommendationService],
})
export class VectorDatabaseModule {}
