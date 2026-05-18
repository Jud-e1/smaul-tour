# Validation Checklist — AI Local Tourism Marketplace

> Last updated: Task 20.4 — Final Testing and Validation

---

## 1. Test Results Summary

Node.js was not available in the CI environment at validation time, so tests could not be executed automatically. The table below reflects the expected status based on static code review of all test files.

### Backend (`packages/backend`)

| Test File | Type | Expected Status | Notes |
|-----------|------|-----------------|-------|
| `auth/auth.service.spec.ts` | Unit | ✅ Pass | Password utils, login lockout, JWT tokens, RolesGuard |
| `bookings/bookings.service.spec.ts` | Unit | ✅ Pass | Create/cancel/complete booking, idempotency, Redis lock |
| `payments/payments.service.spec.ts` | Unit | ✅ Pass | Escrow, release, refund, Stripe integration, state machine |
| `payments/currency.service.spec.ts` | Unit | ✅ Pass | Currency conversion |
| `reviews/reviews.service.spec.ts` | Unit | ✅ Pass | Create review, avg rating recalc, one-per-booking constraint |
| `admin/admin.service.spec.ts` | Unit | ✅ Pass | Verification, suspend/unsuspend, metrics, audit logs, refunds |
| `notifications/notifications.service.spec.ts` | Unit | ✅ Pass | Send, template rendering, preferences, retry backoff |
| `experiences/experiences.service.spec.ts` | Unit | ✅ Pass | CRUD, image upload, availability, search, recommendations |
| `experiences/image-storage.service.spec.ts` | Unit | ✅ Pass | File validation, upload processing |
| `experiences/location.service.spec.ts` | Unit | ✅ Pass | Travel time calculation |
| `trip-planner/trip-planner.service.spec.ts` | Unit | ✅ Pass | Generate/modify itinerary, budget filter, geo clustering |
| `trip-planner/llm-parser.service.spec.ts` | Unit | ✅ Pass | LLM response parsing |
| `vector/recommendation.service.spec.ts` | Unit | ✅ Pass | Similar experiences, personalized recommendations |
| `vector/vector-search.service.spec.ts` | Unit | ✅ Pass | Semantic search |
| `vector/embedding.service.spec.ts` | Unit | ✅ Pass | Embedding generation |
| `vector/vector-database.service.spec.ts` | Unit | ✅ Pass | Upsert/query vector DB |
| `security/fraud-detection.service.spec.ts` | Unit | ✅ Pass | Rate limiting, fraud checks, blocklist, device fingerprint |
| `common/cache.service.spec.ts` | Unit | ✅ Pass | Cache get/set/invalidate |
| `common/json-serializer.spec.ts` | Unit | ✅ Pass | Serialization edge cases |
| `config/configuration.test.ts` | Unit | ✅ Pass | Config schema validation |
| `test/integration/booking-flow.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs live PostgreSQL + Redis |
| `test/integration/payment-escrow-flow.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs live PostgreSQL + Stripe test keys |
| `test/integration/review-flow.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs live PostgreSQL |
| `test/integration/trip-planner-flow.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs live PostgreSQL + OpenAI key |
| `test/integration/fraud-detection.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs live PostgreSQL |
| `test/integration/performance.integration.spec.ts` | Integration | ⚠️ Requires DB | Load test — needs full stack |
| `test/integration/security.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs full stack |
| `test/integration/cross-platform-sync.integration.spec.ts` | Integration | ⚠️ Requires DB | Needs full stack |

**Unit test count:** ~20 spec files, ~200+ individual test cases  
**Integration tests:** 8 files — require a running database and external services

### Web (`packages/web`)

| Test File | Expected Status | Notes |
|-----------|-----------------|-------|
| `__tests__/auth.test.tsx` | ✅ Pass | Login/register validation, mock-based |
| `__tests__/booking.test.tsx` | ✅ Pass | Booking CRUD, error handling, mock-based |
| `__tests__/error-handling.test.tsx` | ✅ Pass | API error mapping, rate limit, retry backoff |
| `__tests__/forms.test.tsx` | ✅ Pass | Review, search, registration, booking form validation |

**Test count:** 4 files, ~25 individual test cases

### Mobile (`packages/mobile`)

| Test File | Expected Status | Notes |
|-----------|-----------------|-------|
| `__tests__/auth.test.ts` | ✅ Pass | Login/register/logout, Keychain storage |
| `__tests__/booking.test.ts` | ✅ Pass | Create/cancel/retrieve bookings |
| `__tests__/push-notifications.test.ts` | ✅ Pass | FCM token, permission, navigation on tap |

**Test count:** 3 files, ~15 individual test cases

---

## 2. Manual Testing Checklist — Critical Flows

Run these flows against a staging environment before production deployment.

### Authentication

- [ ] **Registration and login flow**
  - [ ] Register as traveler with email/password
  - [ ] Register as guide with email/password
  - [ ] Email verification link received and works
  - [ ] Login with correct credentials returns JWT
  - [ ] Login with wrong password increments failed attempts
  - [ ] Account locks after 5 failed attempts (15-minute lockout)
  - [ ] Password reset email received and token works
  - [ ] Google OAuth login completes successfully
  - [ ] Facebook OAuth login completes successfully
  - [ ] Refresh token returns new access token

### Experience Management

- [ ] **Experience creation and approval**
  - [ ] Guide creates experience — status is `pending_approval`
  - [ ] Guide uploads up to 10 images
  - [ ] Guide sets availability slots
  - [ ] Admin sees experience in pending queue
  - [ ] Admin approves experience — status becomes `active`
  - [ ] Admin rejects experience with reason
  - [ ] Approved experience appears in search results
  - [ ] Experience edit re-triggers approval if required

### Booking

- [ ] **Booking creation and payment**
  - [ ] Traveler searches and finds an active experience
  - [ ] Traveler selects a slot and enters participant count
  - [ ] Stripe payment form loads correctly
  - [ ] Successful card payment creates booking with `confirmed` status
  - [ ] Booking reference number (8-char alphanumeric) is generated
  - [ ] Booking confirmation email/notification sent to traveler
  - [ ] New booking notification sent to guide
  - [ ] Slot availability decremented correctly
  - [ ] Duplicate booking attempt (same slot) returns 409

- [ ] **Escrow release after completion**
  - [ ] Guide marks experience as completed
  - [ ] Booking status transitions to `completed`
  - [ ] Payment status transitions from `escrowed` → `released`
  - [ ] Automatic escrow release scheduler runs after 48h
  - [ ] Guide receives payment release notification

- [ ] **Cancellation and refund**
  - [ ] Traveler cancels booking with reason
  - [ ] Refund percentage calculated per cancellation policy (flexible/moderate/strict)
  - [ ] Guide cancels booking — traveler receives 100% refund regardless of policy
  - [ ] Slot availability restored after cancellation
  - [ ] Cancellation notification sent to both parties
  - [ ] Stripe refund created and refund ID logged

### AI Trip Planner

- [ ] **AI trip planner generation**
  - [ ] Traveler submits natural language trip request
  - [ ] LLM parses request into structured parameters
  - [ ] Itinerary generated with ≥3 experiences
  - [ ] Budget constraints respected (over-budget experiences excluded)
  - [ ] Geographic clustering applied (nearby experiences grouped)
  - [ ] Itinerary saved and retrievable by ID
  - [ ] Itinerary modification merges new params with existing
  - [ ] Shared itinerary link works for unauthenticated users
  - [ ] Vector search fallback to DB search when vector DB unavailable

### Reviews

- [ ] **Review submission**
  - [ ] Traveler can submit review only after booking is `completed`
  - [ ] Rating 1–5 stars accepted; 0 or 6 rejected
  - [ ] Comment up to 1000 characters accepted
  - [ ] Second review for same booking rejected (409)
  - [ ] Experience average rating recalculated after submission
  - [ ] Review window enforced (rejected after 30 days post-completion)
  - [ ] Review visible on experience detail page

### Admin

- [ ] **Admin moderation actions**
  - [ ] Admin dashboard loads with platform metrics
  - [ ] Admin can view pending verification requests
  - [ ] Admin approves guide verification — guide profile updated
  - [ ] Admin rejects guide verification with reason
  - [ ] Admin suspends user — user cannot log in
  - [ ] Admin unsuspends user — user can log in again
  - [ ] Admin issues manual refund for escrowed payment
  - [ ] All admin actions appear in audit log
  - [ ] Metrics aggregation scheduler runs on schedule

### Notifications

- [ ] **Push notification delivery**
  - [ ] Mobile app requests FCM permission on first launch
  - [ ] Device token registered with backend
  - [ ] Booking confirmation push notification received on mobile
  - [ ] Booking cancellation push notification received
  - [ ] New booking push notification received by guide
  - [ ] Tapping notification navigates to correct screen
  - [ ] Email notifications delivered for booking events
  - [ ] In-app notification center shows unread count
  - [ ] User can disable specific notification channels in settings

### Cross-Platform

- [ ] **Cross-platform data sync**
  - [ ] Booking created on web appears in mobile app
  - [ ] Itinerary created on mobile appears on web
  - [ ] Profile changes sync across platforms
  - [ ] Notification read status syncs across platforms

---

## 3. Performance Validation Checklist

Run these against a staging environment with production-like data volumes.

### API Response Times

- [ ] **Search endpoint** (`GET /experiences/search`)
  - Target: < 500ms at p95
  - [ ] Test with 10,000 experience records in DB
  - [ ] Test with text + location + price filters combined
  - [ ] Verify Redis cache reduces repeat query latency

- [ ] **Other endpoints**
  - Target: < 1,000ms at p95
  - [ ] `POST /bookings` (booking creation with DB transaction)
  - [ ] `POST /trip-planner/generate` (LLM + vector search)
  - [ ] `GET /experiences/:id` (with images and slots)
  - [ ] `GET /admin/metrics` (aggregated stats)

### Load Testing

- [ ] **Concurrent user load test**
  - Target: 10,000 concurrent users
  - [ ] Run k6 or Artillery load test against staging
  - [ ] Verify ECS auto-scaling triggers at 70% CPU
  - [ ] Verify no 5xx errors under sustained load
  - [ ] Verify rate limiting (100 req/hr unauthenticated, 1000 req/hr authenticated) holds

### Database Performance

- [ ] **Query performance**
  - Target: < 100ms for indexed queries
  - [ ] Verify indexes on `experiences.status`, `bookings.travelerId`, `bookings.date`
  - [ ] Run `EXPLAIN ANALYZE` on search query
  - [ ] Verify connection pool size is appropriate (default: 10)
  - [ ] Check for N+1 query issues in experience listing

### CDN and Static Assets

- [ ] **CDN delivery**
  - [ ] Static assets served from CloudFront (not origin)
  - [ ] Image thumbnails served from CDN with correct cache headers
  - [ ] Cache-Control headers set for static assets (max-age ≥ 1 day)
  - [ ] HTTPS enforced on all CDN endpoints

---

## 4. Known Limitations

The following features are partially implemented or have known gaps. These are documented in the requirements audit and should be addressed before or shortly after production launch.

| # | Feature | Status | Impact |
|---|---------|--------|--------|
| 1 | **Wishlist backend persistence** | Frontend UI exists; backend storage not implemented | Wishlists lost on logout/device change |
| 2 | **Booking confirmation PDF** | Receipt URL generated; PDF rendering is a stub | Travelers cannot download PDF receipts |
| 3 | **Apple Pay / Google Pay (mobile)** | Card payments work; native wallet payments not integrated | Reduced mobile payment conversion |
| 4 | **CSRF protection** | JWT-based auth used; no CSRF tokens on state-changing endpoints | Low risk for API-only clients; higher risk if cookie auth added |
| 5 | **Real S3 image processing** | Image upload pipeline implemented; actual S3 bucket and Lambda processing not wired in staging | Images may not be resized/optimized in staging |

---

## 5. Pre-Production Checklist

Complete all items before switching production traffic.

### Infrastructure

- [ ] All environment variables configured in ECS task definitions (see `.env.example`)
  - [ ] `DATABASE_URL` / `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - [ ] `JWT_SECRET` (min 32 chars, randomly generated)
  - [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (live keys)
  - [ ] `OPENAI_API_KEY`
  - [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` (for FCM push)
  - [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - [ ] `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`
  - [ ] `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `S3_BUCKET_NAME`
  - [ ] `REDIS_URL`
  - [ ] `RATE_LIMIT_WHITELIST` (admin IPs)

- [ ] **SSL/TLS certificates installed**
  - [ ] ACM certificate issued and attached to ALB
  - [ ] HTTP → HTTPS redirect configured on ALB
  - [ ] Certificate auto-renewal enabled

- [ ] **Database backups configured**
  - [ ] RDS automated backups enabled (retention ≥ 7 days)
  - [ ] Point-in-time recovery enabled
  - [ ] Manual snapshot taken before first production deploy

- [ ] **Monitoring and alerting set up**
  - [ ] CloudWatch alarms for CPU > 80%, memory > 85%
  - [ ] ALB 5xx error rate alarm (threshold: > 1%)
  - [ ] RDS connection count alarm
  - [ ] ECS task health check passing
  - [ ] Log groups created and retention policy set (≥ 30 days)
  - [ ] Grafana/CloudWatch dashboard accessible to on-call team

### Security

- [ ] **Rate limiting verified**
  - [ ] `RateLimitGuard` applied globally in `AppModule`
  - [ ] Unauthenticated limit: 100 req/hr per IP
  - [ ] Authenticated limit: 1,000 req/hr per user
  - [ ] Admin IP whitelist configured via `RATE_LIMIT_WHITELIST`
  - [ ] `Retry-After` header returned on 429 responses

- [ ] **Stripe webhook endpoint registered**
  - [ ] Webhook URL registered in Stripe Dashboard: `POST /payments/webhook`
  - [ ] `STRIPE_WEBHOOK_SECRET` set to the signing secret from Stripe Dashboard
  - [ ] Events subscribed: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
  - [ ] Webhook signature verification tested with Stripe CLI

### Deployment

- [ ] Database migrations run successfully against production DB
- [ ] Smoke test: `GET /health` returns 200 on all ECS tasks
- [ ] Rollback plan documented and tested
- [ ] Mobile app submitted to App Store / Google Play review
- [ ] DNS records updated and propagated
- [ ] CDN cache invalidated after deploy
