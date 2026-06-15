import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RateLimitRecord, RateLimitViolation } from './interfaces/security.interfaces';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const UNAUTH_LIMIT = 100;
const AUTH_LIMIT = 1000;

// Base backoff: 5 minutes, doubles per violation, capped at 1 hour
const BASE_BACKOFF_MS = 5 * 60 * 1000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitRecord>();
  private readonly adminWhitelist: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const whitelist = this.configService.get<string>('ADMIN_IP_WHITELIST', '');
    this.adminWhitelist = new Set(
      whitelist
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id?: string; role?: string } }>();
    const res = http.getResponse<Response>();

    const ip = this.extractIp(req);

    // Whitelist admin IPs
    if (this.adminWhitelist.has(ip)) {
      return true;
    }

    const userId = req.user?.id;
    const isAuthenticated = !!userId;
    const identifier = isAuthenticated ? `user:${userId}` : `ip:${ip}`;
    const limit = isAuthenticated ? AUTH_LIMIT : UNAUTH_LIMIT;
    const endpoint = req.path;

    const now = Date.now();
    let record = this.store.get(identifier);

    // Check exponential backoff
    if (record?.backoffUntil && now < record.backoffUntil) {
      const retryAfterSec = Math.ceil((record.backoffUntil - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      this.logViolation({
        identifier,
        type: isAuthenticated ? 'user' : 'ip',
        timestamp: new Date(),
        requestCount: record.count,
        limit,
        endpoint,
      });
      throw new HttpException(
        { statusCode: 429, message: 'Too Many Requests', retryAfter: retryAfterSec },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Reset window if expired
    if (!record || now - record.windowStart >= WINDOW_MS) {
      record = { count: 0, windowStart: now, violations: record?.violations ?? 0 };
    }

    record.count += 1;
    this.store.set(identifier, record);

    if (record.count > limit) {
      record.violations += 1;
      const backoffMs = Math.min(
        BASE_BACKOFF_MS * Math.pow(2, record.violations - 1),
        MAX_BACKOFF_MS
      );
      record.backoffUntil = now + backoffMs;
      this.store.set(identifier, record);

      const retryAfterSec = Math.ceil(backoffMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));

      this.logViolation({
        identifier,
        type: isAuthenticated ? 'user' : 'ip',
        timestamp: new Date(),
        requestCount: record.count,
        limit,
        endpoint,
      });

      throw new HttpException(
        { statusCode: 429, message: 'Too Many Requests', retryAfter: retryAfterSec },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Set rate limit headers
    const remaining = Math.max(0, limit - record.count);
    const resetSec = Math.ceil((record.windowStart + WINDOW_MS - now) / 1000);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSec));

    return true;
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }
    return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
  }

  private logViolation(violation: RateLimitViolation): void {
    this.logger.warn(
      `Rate limit violation: identifier=${violation.identifier} type=${violation.type} ` +
        `count=${violation.requestCount} limit=${violation.limit} endpoint=${violation.endpoint} ` +
        `timestamp=${violation.timestamp.toISOString()}`
    );
  }

  /** Exposed for testing: reset all records */
  clearStore(): void {
    this.store.clear();
  }

  /** Exposed for testing: get a record */
  getRecord(identifier: string): RateLimitRecord | undefined {
    return this.store.get(identifier);
  }
}
