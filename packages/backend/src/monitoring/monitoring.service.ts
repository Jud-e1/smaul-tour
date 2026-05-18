import { Injectable, Logger } from '@nestjs/common';

interface ApiMetric {
  endpoint: string;
  responseTimeMs: number;
  timestamp: number;
}

interface DbMetric {
  query: string;
  durationMs: number;
  timestamp: number;
}

/** Alert thresholds from Requirements 25.4 and 25.5 */
const API_ALERT_THRESHOLD_MS = 2000;
const DB_ALERT_THRESHOLD_MS = 500;
/** Slow query threshold from Requirement 17.7 */
const SLOW_QUERY_LOG_THRESHOLD_MS = 100;

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  private readonly apiMetrics: ApiMetric[] = [];
  private readonly dbMetrics: DbMetric[] = [];

  // Business metrics (Requirement 25.6)
  private dailyActiveUsers = new Set<string>();
  private bookingsToday = 0;
  private revenueToday = 0;

  /**
   * Record an API request with its response time.
   * Alerts when average exceeds 2 seconds (Requirement 25.4).
   */
  recordApiRequest(endpoint: string, responseTimeMs: number): void {
    this.apiMetrics.push({ endpoint, responseTimeMs, timestamp: Date.now() });

    if (responseTimeMs > API_ALERT_THRESHOLD_MS) {
      this.logger.warn(
        `[ALERT] Slow API response: ${endpoint} took ${responseTimeMs}ms (threshold: ${API_ALERT_THRESHOLD_MS}ms)`,
      );
    }

    // Keep only last 1000 entries to avoid unbounded growth
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics.splice(0, this.apiMetrics.length - 1000);
    }
  }

  /**
   * Record a database query duration.
   * Alerts when query exceeds 500ms (Requirement 25.5).
   * Logs slow queries >100ms (Requirement 17.7).
   */
  recordDbQuery(query: string, durationMs: number): void {
    this.dbMetrics.push({ query, durationMs, timestamp: Date.now() });

    if (durationMs > SLOW_QUERY_LOG_THRESHOLD_MS) {
      this.logger.warn(`Slow query (${durationMs}ms): ${query.substring(0, 200)}`);
    }

    if (durationMs > DB_ALERT_THRESHOLD_MS) {
      this.logger.error(
        `[ALERT] DB query exceeded ${DB_ALERT_THRESHOLD_MS}ms threshold: ${durationMs}ms — ${query.substring(0, 200)}`,
      );
    }

    if (this.dbMetrics.length > 1000) {
      this.dbMetrics.splice(0, this.dbMetrics.length - 1000);
    }
  }

  /** Track a daily active user (Requirement 25.6) */
  recordActiveUser(userId: string): void {
    this.dailyActiveUsers.add(userId);
  }

  /** Track a booking creation (Requirement 25.6) */
  recordBooking(amount: number): void {
    this.bookingsToday++;
    this.revenueToday += amount;
  }

  /** Reset daily counters — call at midnight */
  resetDailyMetrics(): void {
    this.dailyActiveUsers.clear();
    this.bookingsToday = 0;
    this.revenueToday = 0;
  }

  /**
   * Return aggregated metrics snapshot.
   */
  getMetrics(): {
    averageResponseTimeMs: number;
    p95ResponseTimeMs: number;
    slowApiRequestCount: number;
    totalApiRequests: number;
    averageDbQueryTimeMs: number;
    slowQueryCount: number;
    totalDbQueries: number;
    dailyActiveUsers: number;
    bookingsToday: number;
    revenueToday: number;
  } {
    const apiTimes = this.apiMetrics.map((m) => m.responseTimeMs);
    const dbTimes = this.dbMetrics.map((m) => m.durationMs);

    return {
      averageResponseTimeMs: this.average(apiTimes),
      p95ResponseTimeMs: this.percentile(apiTimes, 95),
      slowApiRequestCount: apiTimes.filter((t) => t > API_ALERT_THRESHOLD_MS).length,
      totalApiRequests: apiTimes.length,
      averageDbQueryTimeMs: this.average(dbTimes),
      slowQueryCount: dbTimes.filter((t) => t > SLOW_QUERY_LOG_THRESHOLD_MS).length,
      totalDbQueries: dbTimes.length,
      dailyActiveUsers: this.dailyActiveUsers.size,
      bookingsToday: this.bookingsToday,
      revenueToday: this.revenueToday,
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
}
