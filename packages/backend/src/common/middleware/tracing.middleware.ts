import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const TRACE_ID_HEADER = 'x-trace-id';
export const SPAN_ID_HEADER = 'x-span-id';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Tracing');

  use(req: Request, res: Response, next: NextFunction): void {
    // Use incoming trace ID or generate a new one (Requirement 25.8)
    const traceId = (req.headers[TRACE_ID_HEADER] as string) || randomUUID();
    const spanId = randomUUID();

    // Attach to request for downstream use
    (req as any).traceId = traceId;
    (req as any).spanId = spanId;

    // Propagate trace headers in response
    res.setHeader(TRACE_ID_HEADER, traceId);
    res.setHeader(SPAN_ID_HEADER, spanId);

    this.logger.debug(
      `Trace started: traceId=${traceId} spanId=${spanId} ${req.method} ${req.originalUrl}`
    );

    next();
  }
}
