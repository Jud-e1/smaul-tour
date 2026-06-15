# Database Module

This module provides database connectivity, connection pooling, health checks, and migrations for the AI-Powered Local Tourism Marketplace.

## Features

- **TypeORM Integration**: Full TypeORM support with PostgreSQL
- **Connection Pooling**: Minimum 20 connections as per Requirement 17.3
- **Health Checks**: Database connectivity monitoring
- **Retry Logic**: Automatic connection retry with exponential backoff
- **Migrations**: Database schema versioning and migration support

## Configuration

Database configuration is loaded from environment variables or the configuration file:

```yaml
database:
  host: localhost
  port: 5432
  name: tourism_marketplace
  user: postgres
  password: postgres
  poolSize: 20
```

## Connection Pooling

The database module implements connection pooling with the following settings:

- **Minimum connections**: 20 (configurable via `database.poolSize`)
- **Maximum connections**: 40 (2x pool size)
- **Connection timeout**: 5 seconds
- **Idle timeout**: 30 seconds
- **Max lifetime**: 1 hour
- **Keep-alive**: Enabled with 10-second initial delay

## Health Checks

The database health service provides:

1. **Basic health check**: `GET /health` - Overall system health including database
2. **Database-specific check**: `GET /health/db` - Detailed database health information

Health check response includes:

- Connection status
- Response time
- Active connections count
- Error details (if any)

## Retry Logic

The module implements automatic retry logic for connection failures:

- **Max retries**: 3 attempts
- **Retry delay**: Exponential backoff (1s, 2s, 4s)
- **Connection error detection**: Handles common PostgreSQL connection errors

## Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Revert the last migration
npm run migrate:revert

# Generate a new migration from entity changes
npm run migrate:generate -- src/database/migrations/MigrationName

# Create a blank migration file
npm run migrate:create -- src/database/migrations/MigrationName
```

### Initial Migration

The initial migration (`1700000000000-InitialSchema.ts`) creates all required tables:

- users
- user_profiles
- experiences
- images
- availability_slots
- bookings
- payments
- transaction_logs
- reviews
- itineraries
- itinerary_experiences
- notifications
- verification_requests
- verification_documents
- audit_logs

## Entities

All database entities are located in `src/database/entities/`:

- `user.entity.ts` - User accounts
- `user-profile.entity.ts` - User profile information
- `experience.entity.ts` - Experience listings
- `image.entity.ts` - Experience images
- `availability-slot.entity.ts` - Experience availability
- `booking.entity.ts` - Booking records
- `payment.entity.ts` - Payment transactions
- `transaction-log.entity.ts` - Payment audit trail
- `review.entity.ts` - Experience reviews
- `itinerary.entity.ts` - AI-generated itineraries
- `itinerary-experience.entity.ts` - Itinerary-experience relationships
- `notification.entity.ts` - User notifications
- `verification-request.entity.ts` - Guide verification requests
- `verification-document.entity.ts` - Verification documents
- `audit-log.entity.ts` - Admin action audit trail

## Usage

### Importing the Database Module

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
```

### Using Entities in Services

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './database/entities';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findById(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }
}
```

### Using Database Health Service

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseHealthService } from './database/database-health.service';

@Injectable()
export class MyService {
  constructor(private readonly dbHealth: DatabaseHealthService) {}

  async checkConnection() {
    const health = await this.dbHealth.checkHealth();
    if (!health.isHealthy) {
      // Handle unhealthy database
    }
  }

  async executeWithRetry() {
    return this.dbHealth.executeWithRetry(async () => {
      // Your database operation here
    });
  }
}
```

## Requirements Mapping

This module implements the following requirements:

- **Requirement 2.1**: Experience listing management (database schema)
- **Requirement 4.1**: Booking creation and management (database schema)
- **Requirement 5.1**: Escrow payment processing (database schema)
- **Requirement 8.1**: Review and rating system (database schema)
- **Requirement 9.1**: Guide verification system (database schema)
- **Requirement 11.1**: User authentication (database schema)
- **Requirement 17.3**: Connection pooling with minimum 20 connections, health checks, and retry logic

## PostgreSQL Extensions

The migration automatically enables required PostgreSQL extensions:

- `uuid-ossp`: UUID generation
- `cube`: Geometric calculations
- `earthdistance`: Geographic distance calculations

## Indexes

All tables include appropriate indexes for:

- Primary keys
- Foreign keys
- Frequently queried columns
- Geographic queries (using GIST indexes)
- Array columns (using GIN indexes)

## Best Practices

1. **Never use `synchronize: true` in production** - Always use migrations
2. **Use transactions for multi-step operations** - Ensure data consistency
3. **Implement proper error handling** - Use the retry logic for transient failures
4. **Monitor connection pool** - Check health endpoints regularly
5. **Keep migrations reversible** - Always implement the `down` method
6. **Test migrations** - Test both `up` and `down` migrations before deploying
