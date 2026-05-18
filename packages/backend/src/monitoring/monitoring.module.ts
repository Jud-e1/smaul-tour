import { Module, Global } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { CacheService } from '../common/cache/cache.service';

@Global()
@Module({
  providers: [MonitoringService, CacheService],
  exports: [MonitoringService, CacheService],
})
export class MonitoringModule {}
