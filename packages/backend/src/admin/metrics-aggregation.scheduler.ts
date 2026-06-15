import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminService } from './admin.service';

/**
 * Scheduled job that aggregates platform metrics daily.
 * Satisfies Requirement 22.3 (daily metrics aggregation) and 5.5 (scheduled jobs).
 */
@Injectable()
export class MetricsAggregationScheduler {
  private readonly logger = new Logger(MetricsAggregationScheduler.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * Runs daily at 1:00 AM to aggregate platform metrics for the previous day.
   * Pre-warms the metrics cache so dashboard queries are fast.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async aggregateDailyMetrics(): Promise<void> {
    this.logger.log('Starting daily metrics aggregation...');

    const now = new Date();
    const endOfYesterday = new Date(now);
    endOfYesterday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(endOfYesterday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    try {
      const metrics = await this.adminService.getMetrics(startOfYesterday, endOfYesterday);
      this.logger.log(
        `Daily metrics aggregated: ${metrics.totalBookings} bookings, ` +
          `revenue ${metrics.totalRevenue.amount} ${metrics.totalRevenue.currency}`
      );
    } catch (error) {
      this.logger.error('Failed to aggregate daily metrics', (error as Error).message);
    }
  }

  /**
   * Runs weekly on Sunday at 2:00 AM to aggregate the past 7 days of metrics.
   */
  @Cron('0 2 * * 0')
  async aggregateWeeklyMetrics(): Promise<void> {
    this.logger.log('Starting weekly metrics aggregation...');

    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    try {
      const metrics = await this.adminService.getMetrics(startDate, endDate);
      this.logger.log(
        `Weekly metrics aggregated: ${metrics.totalBookings} bookings, ` +
          `${metrics.totalUsers} total users, ` +
          `revenue ${metrics.totalRevenue.amount} ${metrics.totalRevenue.currency}`
      );
    } catch (error) {
      this.logger.error('Failed to aggregate weekly metrics', (error as Error).message);
    }
  }
}
