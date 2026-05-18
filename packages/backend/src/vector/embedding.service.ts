import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private getCacheKey(text: string): string {
    return `emb_${Buffer.from(text).toString('base64').slice(0, 32)}`;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);
    const cached = await this.cacheManager.get<number[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const [embedding] = await this.callOpenAIEmbeddings([text]);
    await this.cacheManager.set(cacheKey, embedding, 3600);
    return embedding;
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i]);
      const cached = await this.cacheManager.get<number[]>(cacheKey);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    // Batch-fetch uncached embeddings
    if (uncachedTexts.length > 0) {
      const embeddings = await this.callOpenAIEmbeddings(uncachedTexts);
      for (let j = 0; j < uncachedTexts.length; j++) {
        const originalIndex = uncachedIndices[j];
        results[originalIndex] = embeddings[j];
        const cacheKey = this.getCacheKey(uncachedTexts[j]);
        await this.cacheManager.set(cacheKey, embeddings[j], 3600);
      }
    }

    return results;
  }

  async generateExperienceEmbedding(experience: {
    title: string;
    description: string;
    category: string[];
  }): Promise<number[]> {
    const combinedText = [
      experience.title,
      experience.description,
      experience.category.join(', '),
    ]
      .filter(Boolean)
      .join(' | ');

    return this.generateEmbedding(combinedText);
  }

  private async callOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = this.configService.get<string>('llm.apiKey');

    try {
      const response = await axios.post<{
        data: Array<{ embedding: number[]; index: number }>;
      }>(
        OPENAI_EMBEDDINGS_URL,
        { input: texts, model: OPENAI_EMBEDDING_MODEL },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Sort by index to preserve order
      const sorted = response.data.data.sort(
        (a: { embedding: number[]; index: number }, b: { embedding: number[]; index: number }) =>
          a.index - b.index,
      );
      return sorted.map((item: { embedding: number[]; index: number }) => item.embedding);
    } catch (error) {
      this.logger.error(
        `OpenAI embeddings API error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
