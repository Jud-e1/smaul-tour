import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const NOTIFICATION_REDIS_CLIENT = 'NOTIFICATION_REDIS_CLIENT';

export interface QueuedNotification {
  notificationId: string;
  userId: string;
  type: string;
  channels: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  data: Record<string, any>;
  attempt: number;
  maxAttempts: number;
  nextRetryAt: Date;
}

/** Minimal Redis interface for notification queue */
export interface NotificationRedisClient {
  lpush(key: string, value: string): Promise<number>;
  rpop(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;
}

/**
 * Notification queue service using Redis for async processing.
 * Falls back to in-memory queue when Redis is not available.
 */
@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly QUEUE_KEY = 'notifications:queue';
  private readonly inMemoryQueue: QueuedNotification[] = [];

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(NOTIFICATION_REDIS_CLIENT) private readonly redis: NotificationRedisClient | null,
  ) {
    if (!redis) {
      this.logger.warn('Redis not available for notification queue. Using in-memory queue.');
    }
  }

  async enqueue(notification: QueuedNotification): Promise<void> {
    if (this.redis) {
      await this.redis.lpush(this.QUEUE_KEY, JSON.stringify(notification));
    } else {
      this.inMemoryQueue.push(notification);
    }
    this.logger.debug(`Enqueued notification ${notification.notificationId} (attempt ${notification.attempt})`);
  }

  async dequeue(): Promise<QueuedNotification | null> {
    if (this.redis) {
      const raw = await this.redis.rpop(this.QUEUE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as QueuedNotification;
    } else {
      return this.inMemoryQueue.pop() ?? null;
    }
  }

  async size(): Promise<number> {
    if (this.redis) {
      return this.redis.llen(this.QUEUE_KEY);
    }
    return this.inMemoryQueue.length;
  }

  /**
   * Calculate exponential backoff delay in milliseconds.
   * attempt=1 → 1s, attempt=2 → 2s, attempt=3 → 4s, etc.
   */
  calculateBackoffMs(attempt: number): number {
    const baseMs = 1000;
    const maxMs = 30000;
    return Math.min(baseMs * Math.pow(2, attempt - 1), maxMs);
  }
}
