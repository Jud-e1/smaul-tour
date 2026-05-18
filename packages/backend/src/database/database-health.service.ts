import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  activeConnections?: number;
  error?: string;
}

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Check database health by executing a simple query
   * Implements health check requirement from 17.3
   */
  async checkHealth(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();

    try {
      // Execute a simple query to check connectivity
      await this.dataSource.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      // Get connection pool statistics
      const poolStats = await this.getPoolStatistics();

      this.logger.debug(`Database health check passed in ${responseTime}ms`);
      this.retryCount = 0; // Reset retry count on success

      return {
        isHealthy: true,
        responseTime,
        activeConnections: poolStats.activeConnections,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Database health check failed: ${errorMessage}`);

      return {
        isHealthy: false,
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Get connection pool statistics
   */
  private async getPoolStatistics(): Promise<{ activeConnections: number }> {
    try {
      const result = await this.dataSource.query(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return {
        activeConnections: parseInt(result[0]?.active_connections || '0', 10),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get pool statistics: ${errorMessage}`);
      return { activeConnections: 0 };
    }
  }

  /**
   * Retry connection with exponential backoff
   * Implements retry logic requirement from 17.3
   */
  async retryConnection(): Promise<boolean> {
    if (this.retryCount >= this.maxRetries) {
      this.logger.error(`Max retry attempts (${this.maxRetries}) reached`);
      return false;
    }

    this.retryCount++;
    const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);

    this.logger.warn(
      `Retrying database connection (attempt ${this.retryCount}/${this.maxRetries}) in ${delay}ms`,
    );

    await this.sleep(delay);

    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      const health = await this.checkHealth();
      
      if (health.isHealthy) {
        this.logger.log('Database connection restored');
        this.retryCount = 0;
        return true;
      }

      return this.retryConnection();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Retry attempt ${this.retryCount} failed: ${errorMessage}`);
      return this.retryConnection();
    }
  }

  /**
   * Check if database connection is established
   */
  isConnected(): boolean {
    return this.dataSource.isInitialized;
  }

  /**
   * Get database connection info
   */
  getConnectionInfo(): {
    isInitialized: boolean;
    database: string;
    host: string;
    port: number;
  } {
    return {
      isInitialized: this.dataSource.isInitialized,
      database: this.dataSource.options.database as string,
      host: (this.dataSource.options as any).host,
      port: (this.dataSource.options as any).port,
    };
  }

  /**
   * Execute a query with automatic retry on failure
   */
  async executeWithRetry<T>(
    queryFn: () => Promise<T>,
    retries = 3,
  ): Promise<T> {
    try {
      return await queryFn();
    } catch (error) {
      if (retries > 0 && this.isConnectionError(error)) {
        this.logger.warn(
          `Query failed with connection error, retrying... (${retries} attempts left)`,
        );
        await this.sleep(1000);
        return this.executeWithRetry(queryFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is a connection error
   */
  private isConnectionError(error: unknown): boolean {
    const connectionErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      '57P01', // PostgreSQL: terminating connection
      '57P03', // PostgreSQL: cannot connect now
      '08006', // PostgreSQL: connection failure
    ];

    const err = error as any;
    return (
      connectionErrorCodes.includes(err.code) ||
      err.message?.includes('Connection terminated') ||
      err.message?.includes('Connection lost')
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
