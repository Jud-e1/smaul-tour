# Development Guide

## Project Setup

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-local-tourism-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cd packages/backend
   cp .env.example .env
   # Edit .env with your configuration

   # Web
   cd ../web
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   npm run migrate --workspace=packages/backend
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

## Development Workflow

### Working with the Monorepo

This project uses npm workspaces. Each package can be worked on independently:

```bash
# Run command in specific workspace
npm run <script> --workspace=packages/backend
npm run <script> --workspace=packages/web
npm run <script> --workspace=packages/mobile

# Run command in all workspaces
npm run <script> --workspaces
```

### Code Quality

#### Linting
```bash
# Lint all packages
npm run lint

# Lint specific package
npm run lint --workspace=packages/backend
```

#### Formatting
```bash
# Format all code
npm run format

# Check formatting
npm run format:check
```

#### Type Checking
```bash
# TypeScript type checking is automatic during build
npm run build
```

### Testing

#### Unit Tests
```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=packages/backend

# Run tests in watch mode
npm run test:watch --workspace=packages/backend

# Run tests with coverage
npm run test:cov --workspace=packages/backend
```

#### Integration Tests
Integration tests should be placed in `test/` directories and use the `.integration.spec.ts` suffix.

### Database Management

#### Migrations
```bash
# Run migrations
npm run migrate --workspace=packages/backend

# Revert last migration
npm run migrate:revert --workspace=packages/backend

# Generate new migration
npm run migrate:generate --workspace=packages/backend -- MigrationName
```

#### Database Access
- **Adminer UI**: http://localhost:8080
  - System: PostgreSQL
  - Server: postgres
  - Username: postgres
  - Password: postgres
  - Database: tourism_marketplace

### Configuration System

The backend uses a robust configuration system that supports:

1. **Environment Variables** (highest precedence)
2. **Configuration Files** (JSON or YAML)

#### Loading Configuration

```typescript
import { configurationParser } from './config/configuration';

// Load from environment variables
const config = configurationParser.loadFromEnv();

// Load from file with env overrides
const config = configurationParser.loadFromFile('config.yaml');

// Parse and validate
const config = configurationParser.parse(content, 'json');
```

#### Configuration Validation

All configuration is validated using Zod schemas. Invalid configuration will throw descriptive errors:

```
Configuration validation failed:
database.port: Expected number, received string
llm.apiKey: String must contain at least 1 character(s)
```

### API Development

#### Creating New Endpoints

1. **Create a module**
   ```bash
   cd packages/backend
   nest generate module features/my-feature
   ```

2. **Create a controller**
   ```bash
   nest generate controller features/my-feature
   ```

3. **Create a service**
   ```bash
   nest generate service features/my-feature
   ```

4. **Add Swagger documentation**
   ```typescript
   @ApiTags('My Feature')
   @Controller('my-feature')
   export class MyFeatureController {
     @Get()
     @ApiOperation({ summary: 'Get all items' })
     @ApiResponse({ status: 200, description: 'Success' })
     findAll() {
       // Implementation
     }
   }
   ```

#### API Documentation

Access Swagger documentation at: http://localhost:3000/api/docs

### Frontend Development

#### Next.js App Router

The web application uses Next.js 14 with the App Router:

```
packages/web/src/app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── globals.css         # Global styles
└── [feature]/          # Feature routes
    ├── page.tsx
    └── layout.tsx
```

#### Creating New Pages

```typescript
// packages/web/src/app/experiences/page.tsx
export default function ExperiencesPage() {
  return (
    <div>
      <h1>Experiences</h1>
    </div>
  );
}
```

#### API Client

```typescript
// packages/web/src/lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export default apiClient;
```

### Docker Development

#### Start Services
```bash
docker-compose up -d
```

#### View Logs
```bash
docker-compose logs -f [service-name]
```

#### Stop Services
```bash
docker-compose down
```

#### Reset Databases
```bash
docker-compose down -v
docker-compose up -d
```

#### Build Custom Images
```bash
# Backend
docker build -f packages/backend/Dockerfile -t tourism-backend .

# Web
docker build -f packages/web/Dockerfile -t tourism-web .
```

## Debugging

### Backend Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev:backend"],
  "skipFiles": ["<node_internals>/**"],
  "console": "integratedTerminal"
}
```

### Frontend Debugging

Use Chrome DevTools or VS Code debugger with Next.js.

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

1. Ensure Docker services are running: `docker-compose ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify environment variables in `.env`

### Module Not Found

```bash
# Clear node_modules and reinstall
npm run clean
npm install
```

## Performance Optimization

### Backend

- Use database indexes for frequently queried fields
- Implement caching with Redis
- Use connection pooling (configured in database settings)
- Monitor slow queries (logged automatically if >100ms)

### Frontend

- Use Next.js Image component for optimized images
- Implement code splitting with dynamic imports
- Use SWR for data fetching with caching
- Optimize bundle size with tree shaking

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Use class-validator and Zod
3. **Sanitize user data** - Prevent XSS and SQL injection
4. **Use HTTPS** - In production environments
5. **Implement rate limiting** - Already configured with Throttler
6. **Keep dependencies updated** - Run `npm audit` regularly

## Deployment

See `.github/workflows/ci.yml` for CI/CD pipeline configuration.

### Manual Deployment

1. **Build all packages**
   ```bash
   npm run build
   ```

2. **Run production build**
   ```bash
   # Backend
   npm run start:prod --workspace=packages/backend

   # Web
   npm run start --workspace=packages/web
   ```

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeORM Documentation](https://typeorm.io/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
