import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Default TTL: 5 minutes (Requirement 17.5) */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    this.logger.debug(`Cache set: ${key} (ttl: ${ttlMs}ms)`);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.logger.debug(`Cache delete: ${key}`);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.logger.debug('Cache cleared');
  }

  /** Remove expired entries (housekeeping) */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }
}
