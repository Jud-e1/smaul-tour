# Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
   - [Backend to AWS ECS](#backend-to-aws-ecs)
   - [Web to Vercel / AWS](#web-to-vercel--aws)
   - [Mobile to App Store / Google Play](#mobile-to-app-store--google-play)
5. [Infrastructure Provisioning (Terraform)](#infrastructure-provisioning-terraform)
6. [Database Backup and Restore](#database-backup-and-restore)
7. [Health Checks and Verification](#health-checks-and-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Scheduled Jobs](#scheduled-jobs)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20.x | Backend and web builds |
| npm | >= 10.x | Package management (workspaces) |
| Docker | >= 24.x | Local services and image builds |
| Docker Compose | >= 2.x | Local dev orchestration |
| AWS CLI | >= 2.x | ECS / ECR / S3 operations |
| Terraform | >= 1.5.0 | Infrastructure provisioning |
| Fastlane | latest | iOS / Android automated releases |
| Xcode | >= 15 | iOS builds (macOS only) |
| Android Studio | latest | Android builds |
| Vercel CLI | latest | Web deployments to Vercel |

Install AWS CLI and configure credentials:

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-east-1
# Default output format: json
```

---

## Environment Configuration

### Backend (`packages/backend/.env`)

Copy the example file and fill in values:

```bash
cp packages/backend/.env.example packages/backend/.env
```

#### Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | No | `3000` | HTTP port the API listens on |

#### Database (PostgreSQL)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `tourism_marketplace` | Database name |
| `DB_USER` | Yes | `postgres` | Database user |
| `DB_PASSWORD` | Yes | `postgres` | Database password — **change in production** |
| `DB_POOL_SIZE` | No | `20` | Connection pool size |

#### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | Yes | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | _(empty)_ | Redis password (required in production) |

#### LLM / AI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | Yes | `openai` | LLM provider (`openai`) |
| `LLM_API_KEY` | Yes | — | OpenAI API key |
| `LLM_MODEL` | No | `gpt-4` | Model name (e.g. `gpt-4`, `gpt-3.5-turbo`) |
| `LLM_MAX_TOKENS` | No | `2000` | Max tokens per LLM request |

#### Vector Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VECTOR_DB_PROVIDER` | Yes | `pinecone` | Vector DB provider (`pinecone`) |
| `VECTOR_DB_API_KEY` | Yes | — | Pinecone API key |
| `VECTOR_DB_ENVIRONMENT` | Yes | `us-west1-gcp` | Pinecone environment |
| `VECTOR_DB_INDEX` | Yes | `tourism-experiences` | Pinecone index name |

#### Payments (Stripe)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Yes | — | Stripe secret key (`sk_live_...` in production) |
| `STRIPE_WEBHOOK_SECRET` | Yes | — | Stripe webhook signing secret (`whsec_...`) |
| `PAYMENT_PROVIDER` | No | `stripe` | Payment provider identifier |
| `PAYMENT_API_KEY` | No | — | Alias for `STRIPE_SECRET_KEY` |
| `PAYMENT_WEBHOOK_SECRET` | No | — | Alias for `STRIPE_WEBHOOK_SECRET` |

#### JWT / Auth

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | JWT signing secret — **must be changed in production** |
| `JWT_EXPIRES_IN` | No | `3600` | Access token TTL in seconds (1 hour) |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | No | `2592000` | Refresh token TTL in seconds (30 days) |

#### OAuth

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `FACEBOOK_APP_ID` | No | — | Facebook app ID |
| `FACEBOOK_APP_SECRET` | No | — | Facebook app secret |

#### Email (SendGrid)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | `sendgrid` | Email provider |
| `EMAIL_API_KEY` | Yes | — | SendGrid API key |
| `EMAIL_FROM` | No | `noreply@tourismmarketplace.com` | Sender address |

#### Cloud Storage (S3)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | `s3` | Storage provider |
| `STORAGE_BUCKET` | Yes | `tourism-marketplace-images` | S3 bucket name |
| `STORAGE_REGION` | No | `us-east-1` | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | Yes | — | AWS access key (use IAM role in ECS) |
| `AWS_SECRET_ACCESS_KEY` | Yes | — | AWS secret key (use IAM role in ECS) |

#### Maps & Currency

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAPS_API_KEY` | Yes | — | Google Maps API key |
| `EXCHANGE_RATE_API_URL` | No | `https://open.er-api.com/v6/latest/USD` | Exchange rate API endpoint |

#### Frontend URLs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEB_URL` | No | `http://localhost:3001` | Web app URL (used in email links) |
| `MOBILE_DEEP_LINK_SCHEME` | No | `tourismmarketplace` | Deep link URI scheme for mobile |

---

### Web (`packages/web/.env.local`)

```bash
cp packages/web/.env.example packages/web/.env.local
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3000` | Backend API base URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | — | Stripe publishable key (`pk_live_...` in production) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | — | Google Maps API key for the web client |

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/web/.env.example packages/web/.env.local
# Edit both files with your API keys
```

### 3. Start Docker services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`
- pgvector (PostgreSQL + pgvector extension) on port `5433`
- Adminer (DB UI) on port `8080` → http://localhost:8080

Wait for services to be healthy:

```bash
docker-compose ps
```

### 4. Run database migrations

```bash
npm run migrate --workspace=packages/backend
```

### 5. Start development servers

```bash
# All packages in parallel
npm run dev

# Or individually
npm run dev --workspace=packages/backend   # API on :3000
npm run dev --workspace=packages/web       # Web on :3001
```

API docs (Swagger): http://localhost:3000/api/docs

### Useful local commands

```bash
# View service logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Reset all data volumes
docker-compose down -v && docker-compose up -d

# Revert last migration
npm run migrate:revert --workspace=packages/backend

# Generate a new migration
npm run migrate:generate --workspace=packages/backend -- MyMigrationName
```

---

## Production Deployment

### Backend to AWS ECS

The deploy script builds a Docker image, pushes it to ECR, runs migrations, and updates the ECS service.

**Required environment variables for the script:**

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region |
| `ECR_REPO` | `tourism-marketplace/backend` | ECR repository name |
| `ECS_CLUSTER` | `tourism-marketplace` | ECS cluster name |
| `ECS_SERVICE` | `tourism-marketplace-backend` | ECS service name |
| `IMAGE_TAG` | `latest` | Docker image tag (use git SHA in CI) |

**Deploy:**

```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)
bash infrastructure/scripts/deploy-backend.sh
```

**What the script does:**

1. Authenticates Docker with ECR
2. Builds the Docker image from `packages/backend/Dockerfile`
3. Tags and pushes the image to ECR
4. Runs database migrations via a one-off ECS Fargate task
5. Calls `aws ecs update-service --force-new-deployment`
6. Waits for the service to stabilize (`aws ecs wait services-stable`)
7. Hits the `/health` endpoint on the ALB to confirm the deployment

**Manual ECS task definition update (if needed):**

```bash
# Force a new deployment without a new image
aws ecs update-service \
  --cluster tourism-marketplace \
  --service tourism-marketplace-backend \
  --force-new-deployment \
  --region us-east-1
```

---

### Web to Vercel / AWS

**Deploy to Vercel (recommended):**

```bash
# Install Vercel CLI once
npm i -g vercel

export NEXT_PUBLIC_API_URL=https://api.tourismmarketplace.com
bash infrastructure/scripts/deploy-web.sh
```

The script builds the Next.js app and runs `vercel --prod` if the CLI is available.

**Manual Vercel deploy:**

```bash
cd packages/web
vercel --prod
```

**Self-hosted / AWS (alternative):**

```bash
# Build
NEXT_PUBLIC_API_URL=https://api.tourismmarketplace.com \
  npm run build --workspace=packages/web

# Start (requires Node.js on the server)
npm run start --workspace=packages/web
```

Set environment variables in the Vercel dashboard or as ECS task environment variables — never commit them to the repository.

---

### Mobile to App Store / Google Play

The deploy script supports `ios`, `android`, or `both` as the first argument and uses Fastlane when available.

```bash
# Deploy both platforms
ENVIRONMENT=production \
API_URL=https://api.tourismmarketplace.com \
bash infrastructure/scripts/deploy-mobile.sh both

# iOS only
bash infrastructure/scripts/deploy-mobile.sh ios

# Android only
bash infrastructure/scripts/deploy-mobile.sh android
```

**iOS (via Fastlane):**

```bash
cd packages/mobile
fastlane ios ios_release
```

Manual steps (without Fastlane):
1. `cd ios && pod install && cd ..`
2. Open `ios/TourismMarketplace.xcworkspace` in Xcode
3. Set signing team and bundle identifier
4. Product → Archive
5. Window → Organizer → Distribute App → App Store Connect

**Android (via Fastlane):**

```bash
cd packages/mobile
fastlane android android_release
```

Manual steps (without Fastlane):
1. `cd android && ./gradlew bundleRelease`
2. Sign the AAB: `android/app/build/outputs/bundle/release/app-release.aab`
3. Upload to Google Play Console and submit for review

---

## Infrastructure Provisioning (Terraform)

Terraform manages VPC, RDS, ElastiCache, ECS, S3, and ALB.

```bash
cd infrastructure/terraform

# First-time setup
terraform init

# Preview changes
terraform plan -var="db_password=<secure-password>"

# Apply
terraform apply -var="db_password=<secure-password>"
```

State is stored in S3: `s3://tourism-marketplace-tfstate/prod/terraform.tfstate`

Key resources provisioned:
- RDS PostgreSQL 15.4 (`db.t3.medium`, Multi-AZ, 7-day backups)
- ElastiCache Redis (`cache.t3.medium`, 2 nodes, encryption at rest and in transit)
- S3 bucket for images (versioning + AES-256 encryption)
- VPC with public/private subnets across 2 AZs

---

## Database Backup and Restore

### Manual backup with pg_dump

```bash
# Backup to a compressed file
pg_dump \
  -h <DB_HOST> \
  -U <DB_USER> \
  -d tourism_marketplace \
  -Fc \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Example against local Docker instance
pg_dump \
  -h localhost -p 5432 \
  -U postgres \
  -d tourism_marketplace \
  -Fc \
  -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore with pg_restore

```bash
# Restore from a .dump file (drops and recreates all objects)
pg_restore \
  -h <DB_HOST> \
  -U <DB_USER> \
  -d tourism_marketplace \
  --clean \
  --if-exists \
  -Fc \
  backup_20240101_120000.dump

# Restore to a fresh database
createdb -h <DB_HOST> -U <DB_USER> tourism_marketplace_restore
pg_restore \
  -h <DB_HOST> \
  -U <DB_USER> \
  -d tourism_marketplace_restore \
  -Fc \
  backup_20240101_120000.dump
```

### Automated backups (AWS RDS)

RDS is configured (via Terraform) with:
- **Automated daily snapshots** retained for 7 days
- **Backup window**: 03:00–04:00 UTC
- **Maintenance window**: Monday 04:00–05:00 UTC
- **Multi-AZ** for automatic failover

List available snapshots:

```bash
aws rds describe-db-snapshots \
  --db-instance-identifier tourism-marketplace-db \
  --region us-east-1 \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table
```

Create a manual snapshot before a major deployment:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier tourism-marketplace-db \
  --db-snapshot-identifier pre-deploy-$(date +%Y%m%d) \
  --region us-east-1
```

### Point-in-time recovery (PITR)

RDS supports PITR within the backup retention window (7 days). To restore to a specific time:

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier tourism-marketplace-db \
  --target-db-instance-identifier tourism-marketplace-db-restored \
  --restore-time 2024-01-15T10:30:00Z \
  --region us-east-1
```

After the restored instance is available, update `DB_HOST` in the ECS task definition to point to the new endpoint, then redeploy.

### Backup to S3 (self-managed / local)

```bash
# Dump and upload to S3
BACKUP_FILE=backup_$(date +%Y%m%d_%H%M%S).dump
pg_dump -h localhost -U postgres -d tourism_marketplace -Fc -f "$BACKUP_FILE"
aws s3 cp "$BACKUP_FILE" s3://tourism-marketplace-images/db-backups/"$BACKUP_FILE"
rm "$BACKUP_FILE"
```

---

## Health Checks and Verification

### Backend API health

```bash
# Basic health check
curl -f https://api.tourismmarketplace.com/health

# Expected response
# {"status":"ok","database":"connected","redis":"connected"}
```

### ECS service status

```bash
aws ecs describe-services \
  --cluster tourism-marketplace \
  --services tourism-marketplace-backend \
  --region us-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}'
```

### ALB target health

```bash
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names tourism-marketplace-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text --region us-east-1)

aws elbv2 describe-target-health \
  --target-group-arn "$TARGET_GROUP_ARN" \
  --region us-east-1
```

### Database connectivity

```bash
# From a bastion host or ECS exec session
psql -h <DB_HOST> -U dbadmin -d tourism_marketplace -c "SELECT version();"
```

### Redis connectivity

```bash
redis-cli -h <REDIS_HOST> -p 6379 ping
# Expected: PONG
```

### Post-deployment smoke tests

```bash
# Auth endpoint
curl -X POST https://api.tourismmarketplace.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Experiences list
curl https://api.tourismmarketplace.com/experiences

# Web app
curl -f https://tourismmarketplace.com
```

---

## Rollback Procedures

### Backend rollback (ECS)

ECS keeps previous task definition revisions. To roll back to the previous version:

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix tourism-marketplace-backend \
  --sort DESC \
  --region us-east-1 \
  --query 'taskDefinitionArns[:5]'

# Update the service to a specific revision
aws ecs update-service \
  --cluster tourism-marketplace \
  --service tourism-marketplace-backend \
  --task-definition tourism-marketplace-backend:<PREVIOUS_REVISION> \
  --region us-east-1

# Wait for stabilization
aws ecs wait services-stable \
  --cluster tourism-marketplace \
  --services tourism-marketplace-backend \
  --region us-east-1
```

### Web rollback (Vercel)

In the Vercel dashboard: Deployments → select the previous deployment → Promote to Production.

Via CLI:

```bash
vercel rollback [deployment-url]
```

### Database rollback

If a migration introduced a breaking change:

```bash
# Revert the last migration
npm run migrate:revert --workspace=packages/backend
```

For a full restore from a snapshot, see [Point-in-time recovery](#point-in-time-recovery-pitr) above.

### Mobile rollback

Mobile releases cannot be automatically rolled back once published. Options:
- **iOS**: Submit a new build via App Store Connect. Expedited review can be requested for critical issues.
- **Android**: Use Google Play Console to halt a staged rollout or publish a new release.

---

## Scheduled Jobs

All scheduled jobs run inside the backend ECS service using NestJS `@nestjs/schedule`.

### Escrow release

**File**: `packages/backend/src/payments/escrow-release.scheduler.ts`

| Schedule | Cron | Description |
|----------|------|-------------|
| Every hour | `0 * * * *` | Finds payments in `ESCROWED` status older than 24 hours and automatically releases funds to the guide |

### Exchange rate refresh

**File**: `packages/backend/src/payments/currency.service.ts`

| Schedule | Cron | Description |
|----------|------|-------------|
| Daily at midnight | `0 0 * * *` | Fetches latest USD exchange rates from `EXCHANGE_RATE_API_URL` and updates the in-memory cache |

### Metrics aggregation

**File**: `packages/backend/src/admin/metrics-aggregation.scheduler.ts`

| Schedule | Cron | Description |
|----------|------|-------------|
| Daily at 1:00 AM | `0 1 * * *` | Aggregates previous day's bookings and revenue metrics; pre-warms the admin dashboard cache |
| Weekly on Sunday at 2:00 AM | `0 2 * * 0` | Aggregates the past 7 days of metrics |

### Verifying scheduled jobs are running

Check ECS task logs in CloudWatch:

```bash
aws logs tail /ecs/tourism-marketplace-backend \
  --follow \
  --filter-pattern "scheduler"
```

Or filter for specific job output:

```bash
aws logs filter-log-events \
  --log-group-name /ecs/tourism-marketplace-backend \
  --filter-pattern "EscrowReleaseScheduler" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region us-east-1
```
