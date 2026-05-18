import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    // Extract user ID from JWT payload if present (set by auth middleware)
    const userId = (req as any).user?.id || (req as any).user?.sub || 'anonymous';

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;

      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          method,
          path: originalUrl,
          userId,
          statusCode,
          responseTimeMs: responseTime,
        }),
      );

      // Alert if response time exceeds 2 seconds (Requirement 25.4)
      if (responseTime > 2000) {
        this.logger.warn(
          `Slow API response: ${method} ${originalUrl} took ${responseTime}ms (userId: ${userId})`,
        );
      }
    });

    next();
  }
}
