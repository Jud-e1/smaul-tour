import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Response');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl } = req;
    const traceId = req.traceId || 'unknown';
    const userId = req.user?.id || req.user?.sub || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.debug(
          `[${traceId}] ${method} ${originalUrl} completed in ${responseTime}ms (userId: ${userId})`,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        // Log errors with stack traces and request context (Requirement 25.2)
        this.logger.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            traceId,
            userId,
            method,
            path: originalUrl,
            responseTimeMs: responseTime,
            error: {
              message: error.message,
              name: error.name,
              status: error.status || error.statusCode,
              stack: error.stack,
            },
          }),
        );
        return throwError(() => error);
      }),
    );
  }
}
