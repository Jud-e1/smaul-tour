import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseHealthService } from '../database/database-health.service';
import { MonitoringService } from '../monitoring/monitoring.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly monitoringService: MonitoringService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    const dbHealth = await this.databaseHealthService.checkHealth();
    const dbInfo = this.databaseHealthService.getConnectionInfo();
    const metrics = this.monitoringService.getMetrics();

    return {
      status: dbHealth.isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbHealth.isHealthy ? 'connected' : 'disconnected',
        responseTime: dbHealth.responseTime,
        activeConnections: dbHealth.activeConnections,
        host: dbInfo.host,
        database: dbInfo.database,
        error: dbHealth.error,
      },
      performance: {
        averageResponseTimeMs: metrics.averageResponseTimeMs,
        slowApiRequestCount: metrics.slowApiRequestCount,
        totalApiRequests: metrics.totalApiRequests,
        slowQueryCount: metrics.slowQueryCount,
      },
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Database health check endpoint' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  async checkDatabase() {
    const dbHealth = await this.databaseHealthService.checkHealth();
    const dbInfo = this.databaseHealthService.getConnectionInfo();

    return {
      status: dbHealth.isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: {
        isHealthy: dbHealth.isHealthy,
        responseTime: dbHealth.responseTime,
        activeConnections: dbHealth.activeConnections,
        isInitialized: dbInfo.isInitialized,
        host: dbInfo.host,
        port: dbInfo.port,
        database: dbInfo.database,
        error: dbHealth.error,
      },
    };
  }
}
