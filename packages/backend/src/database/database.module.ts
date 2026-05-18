import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseHealthService } from './database-health.service';
import * as entities from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>('database.user', 'postgres'),
        password: configService.get<string>('database.password', 'postgres'),
        database: configService.get<string>('database.name', 'tourism_marketplace'),
        entities: Object.values(entities) as TypeOrmModuleOptions['entities'],
        synchronize: false, // Never use synchronize in production
        logging: configService.get<string>('server.environment') === 'development',
        
        // Connection pooling configuration (Requirement 17.3)
        extra: {
          // Minimum pool size of 20 connections as per requirement
          min: configService.get<number>('database.poolSize', 20),
          max: configService.get<number>('database.poolSize', 20) * 2,
          
          // Connection timeout
          connectionTimeoutMillis: 5000,
          
          // Idle timeout - close idle connections after 30 seconds
          idleTimeoutMillis: 30000,
          
          // Maximum time a connection can be used before being closed
          maxLifetimeSeconds: 3600,
          
          // Enable keep-alive to detect broken connections
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
        },
        
        // Retry connection on failure
        retryAttempts: 5,
        retryDelay: 3000,
        
        // Auto load entities
        autoLoadEntities: true,
        
        // SSL configuration for production
        ssl: configService.get<string>('server.environment') === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
      }),
    }),
  ],
  providers: [DatabaseHealthService],
  exports: [DatabaseHealthService],
})
export class DatabaseModule {}
