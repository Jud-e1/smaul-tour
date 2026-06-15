# AI-Powered Local Tourism Marketplace — API Reference

Interactive Swagger UI: `http://localhost:3000/api/docs`

---

## Authentication

All protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

### Obtaining tokens

1. Register (`POST /auth/register`) or login (`POST /auth/login`) to receive `accessToken` and `refreshToken`.
2. The `accessToken` is short-lived (default 15 min). Use `POST /auth/refresh` with the `refreshToken` to get a new pair.
3. For web OAuth flows, redirect the browser to `GET /auth/google` or `GET /auth/facebook`.

### Token refresh

```
POST /auth/refresh
{ "refreshToken": "<token>" }
→ { "accessToken": "...", "refreshToken": "..." }
```

---

## Base URL & Versioning

| Environment | Base URL                     |
| ----------- | ---------------------------- |
| Local dev   | `http://localhost:3000`      |
| Production  | `https://api.yourdomain.com` |

All paths below are relative to the base URL. The API is currently at v1 (no prefix).

---

## Common Response Formats

### Success

```json
{
  "id": "uuid",
  "...": "resource fields"
}
```

Paginated lists:

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### Error

All errors follow this shape (from the global `HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/experiences"
}
```

Common status codes:

| Code | Meaning                               |
| ---- | ------------------------------------- |
| 400  | Validation error / bad request        |
| 401  | Missing or invalid token              |
| 403  | Insufficient role                     |
| 404  | Resource not found                    |
| 409  | Conflict (duplicate, slot full, etc.) |
| 429  | Rate limit exceeded                   |
| 500  | Internal server error                 |

---

## Rate Limiting

Rate limit headers are returned on every response:

| Header                  | Description                           |
| ----------------------- | ------------------------------------- |
| `X-RateLimit-Limit`     | Max requests per window               |
| `X-RateLimit-Remaining` | Requests remaining                    |
| `X-RateLimit-Reset`     | Unix timestamp when the window resets |

When the limit is exceeded the API returns `429 Too Many Requests`.

---

## Endpoint Reference

### Auth — `/auth`

| Method | Path                      | Auth | Description                      |
| ------ | ------------------------- | ---- | -------------------------------- |
| POST   | `/auth/register`          | No   | Register a new user              |
| POST   | `/auth/login`             | No   | Login with email + password      |
| GET    | `/auth/google`            | No   | Redirect to Google OAuth         |
| GET    | `/auth/google/callback`   | No   | Google OAuth callback            |
| GET    | `/auth/facebook`          | No   | Redirect to Facebook OAuth       |
| GET    | `/auth/facebook/callback` | No   | Facebook OAuth callback          |
| POST   | `/auth/oauth`             | No   | Mobile OAuth (stub)              |
| POST   | `/auth/refresh`           | No   | Refresh access token             |
| POST   | `/auth/reset-password`    | No   | Request password reset email     |
| POST   | `/auth/change-password`   | No   | Set new password via reset token |

**Register request:**

```json
{
  "email": "user@example.com",
  "password": "Secret1234",
  "role": "traveler",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Login / Register response:**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "uuid", "email": "...", "role": "traveler" }
}
```

---

### Experiences — `/experiences`

| Method | Path                                        | Auth   | Description                                       |
| ------ | ------------------------------------------- | ------ | ------------------------------------------------- |
| GET    | `/experiences`                              | No     | Search / list experiences                         |
| GET    | `/experiences/:id`                          | No     | Get experience by ID                              |
| POST   | `/experiences`                              | Guide  | Create experience                                 |
| PUT    | `/experiences/:id`                          | Guide  | Update own experience                             |
| DELETE | `/experiences/:id`                          | Guide  | Delete own experience                             |
| POST   | `/experiences/:id/images`                   | Guide  | Upload image (multipart/form-data, field: `file`) |
| PUT    | `/experiences/:id/images/:imageId/primary`  | Guide  | Set primary image                                 |
| GET    | `/experiences/:id/availability`             | No     | Get availability calendar                         |
| PUT    | `/experiences/:id/availability`             | Guide  | Update availability slots                         |
| GET    | `/experiences/recommendations/personalized` | Bearer | Personalized recommendations                      |
| GET    | `/experiences/:id/recommendations`          | No     | Similar experiences                               |
| POST   | `/experiences/travel-times`                 | No     | Calculate travel times between locations          |
| GET    | `/experiences/:id/reviews`                  | Bearer | Paginated reviews for an experience               |

**Search query parameters:**

| Param                         | Type                                | Description                 |
| ----------------------------- | ----------------------------------- | --------------------------- |
| `text`                        | string                              | Full-text search            |
| `categories`                  | string[]                            | Filter by category tags     |
| `minPrice` / `maxPrice`       | number                              | Price range (USD)           |
| `minDuration` / `maxDuration` | number                              | Duration range (hours)      |
| `lat`, `lng`, `radiusKm`      | number                              | Geo filter                  |
| `minRating`                   | number (0–5)                        | Minimum average rating      |
| `sortBy`                      | `price` \| `rating` \| `popularity` | Sort field                  |
| `sortOrder`                   | `asc` \| `desc`                     | Sort direction              |
| `page` / `pageSize`           | number                              | Pagination (default 1 / 20) |

---

### Bookings — `/bookings`, `/users/:id/bookings`, `/guides/:id/bookings`

| Method | Path                     | Auth          | Description                  |
| ------ | ------------------------ | ------------- | ---------------------------- |
| POST   | `/bookings`              | Traveler      | Create a booking             |
| GET    | `/bookings/:id`          | Bearer        | Get booking by ID            |
| POST   | `/bookings/:id/cancel`   | Bearer        | Cancel a booking             |
| POST   | `/bookings/:id/complete` | Guide / Admin | Mark booking as completed    |
| GET    | `/users/:id/bookings`    | Bearer        | List bookings for a traveler |
| GET    | `/guides/:id/bookings`   | Bearer        | List bookings for a guide    |

**Create booking request:**

```json
{
  "experienceId": "uuid",
  "date": "2026-04-15",
  "startTime": "09:00",
  "participants": 2,
  "idempotencyKey": "optional-unique-key"
}
```

**List bookings query params:** `status` (`pending` | `confirmed` | `completed` | `cancelled` | `refunded`), `groupBy` (`upcoming` | `past` | `cancelled`)

---

### Payments — `/payments`

| Method | Path                         | Auth           | Description                     |
| ------ | ---------------------------- | -------------- | ------------------------------- |
| GET    | `/payments/currencies`       | Bearer         | List supported currencies       |
| POST   | `/payments`                  | Bearer         | Process a payment               |
| GET    | `/payments/:id`              | Bearer         | Get payment details             |
| GET    | `/payments/:id/transactions` | Bearer         | Transaction log                 |
| GET    | `/payments/:id/receipt`      | Bearer         | Generate receipt                |
| POST   | `/payments/:id/escrow`       | Bearer         | Place funds in escrow           |
| POST   | `/payments/:id/release`      | Bearer         | Release escrowed funds to guide |
| POST   | `/payments/:id/refund`       | Bearer         | Refund a payment                |
| POST   | `/payments/:id/confirm`      | Bearer         | Confirm a pending payment       |
| POST   | `/webhooks/stripe`           | No (signature) | Stripe webhook receiver         |

**Process payment request:**

```json
{
  "bookingId": "uuid",
  "amount": 150.0,
  "currency": "USD",
  "paymentMethodId": "pm_stripe_id"
}
```

**Stripe webhook** — send raw body with `Stripe-Signature` header. Handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.

---

### Trip Planner — `/trip-planner`

| Method | Path                            | Auth   | Description                                 |
| ------ | ------------------------------- | ------ | ------------------------------------------- |
| POST   | `/trip-planner/parse`           | Bearer | Parse natural language into trip parameters |
| POST   | `/trip-planner/generate`        | Bearer | Generate itinerary from parameters          |
| GET    | `/trip-planner/itineraries`     | Bearer | List user's saved itineraries               |
| GET    | `/trip-planner/itineraries/:id` | Bearer | Get a specific itinerary                    |
| PUT    | `/trip-planner/itineraries/:id` | Bearer | Modify itinerary with natural language      |

**Parse request:**

```json
{ "naturalLanguageInput": "3-day food and culture trip in Tokyo, budget $500" }
```

**Generate request:**

```json
{
  "parameters": {
    "destination": "Tokyo",
    "duration": 3,
    "budget": 500,
    "interests": ["food", "culture"]
  }
}
```

**Modify request:**

```json
{ "modification": "Add a sushi-making class on day 2" }
```

---

### Notifications — `/notifications`, `/users/:id/notification-preferences`

| Method | Path                                  | Auth   | Description                     |
| ------ | ------------------------------------- | ------ | ------------------------------- |
| GET    | `/notifications`                      | Bearer | List user's notifications       |
| POST   | `/notifications/:id/read`             | Bearer | Mark notification as read       |
| GET    | `/users/:id/notification-preferences` | Bearer | Get notification preferences    |
| PUT    | `/users/:id/notification-preferences` | Bearer | Update notification preferences |

**List query params:** `unreadOnly=true`

**Preferences body:**

```json
{
  "email": { "bookingConfirmed": true, "bookingCancelled": true },
  "push": { "newBooking": false },
  "inApp": { "all": true }
}
```

---

### Reviews — `/reviews`, `/experiences/:id/reviews`, `/guides/:id/reviews`

| Method | Path                       | Auth     | Description                             |
| ------ | -------------------------- | -------- | --------------------------------------- |
| POST   | `/reviews`                 | Traveler | Submit a review for a completed booking |
| POST   | `/reviews/:id/flag`        | Bearer   | Flag a review for moderation            |
| DELETE | `/reviews/:id`             | Admin    | Remove a review                         |
| GET    | `/experiences/:id/reviews` | Bearer   | Paginated reviews for an experience     |
| GET    | `/guides/:id/reviews`      | Bearer   | All reviews for a guide's experiences   |

**Create review request:**

```json
{
  "bookingId": "uuid",
  "rating": 5,
  "comment": "Amazing experience!"
}
```

**Experience reviews query params:** `page`, `pageSize`

---

### Admin — `/admin`

All admin endpoints require `role: admin`.

| Method | Path                                       | Description                      |
| ------ | ------------------------------------------ | -------------------------------- |
| GET    | `/admin/verification-requests`             | List guide verification requests |
| POST   | `/admin/verification-requests/:id/approve` | Approve verification             |
| POST   | `/admin/verification-requests/:id/reject`  | Reject verification              |
| POST   | `/admin/experiences/:id/approve`           | Approve experience listing       |
| POST   | `/admin/experiences/:id/reject`            | Reject experience listing        |
| POST   | `/admin/users/:id/suspend`                 | Suspend user account             |
| POST   | `/admin/users/:id/unsuspend`               | Unsuspend user account           |
| GET    | `/admin/reviews/flagged`                   | List flagged reviews             |
| POST   | `/admin/refunds`                           | Issue admin refund               |
| GET    | `/admin/metrics`                           | Platform metrics                 |
| GET    | `/admin/audit-logs`                        | Admin audit logs                 |

**Metrics query params:** `startDate`, `endDate` (ISO strings; defaults to last 30 days)

**Audit logs query params:** `adminId`, `startDate`, `endDate`

---

### Health — `/health`

| Method | Path      | Auth | Description          |
| ------ | --------- | ---- | -------------------- |
| GET    | `/health` | No   | Service health check |

Returns `{ "status": "ok" }` when all dependencies are healthy.

---

## Usage Examples

### 1. Register and Login

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "Secret1234",
    "role": "traveler",
    "firstName": "Jane",
    "lastName": "Doe"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com", "password": "Secret1234"}'
# → { "accessToken": "eyJ...", "refreshToken": "eyJ...", "user": {...} }

# Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

---

### 2. Search Experiences

```bash
# Text search with geo filter
curl "http://localhost:3000/experiences?text=kayaking&lat=34.0522&lng=-118.2437&radiusKm=25&sortBy=rating&sortOrder=desc"

# Filter by price and category
curl "http://localhost:3000/experiences?categories=outdoor&minPrice=20&maxPrice=100&page=1&pageSize=10"
```

---

### 3. Create a Booking

```bash
TOKEN="eyJ..."

# Create booking
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "experienceId": "uuid-of-experience",
    "date": "2026-04-15",
    "startTime": "09:00",
    "participants": 2,
    "idempotencyKey": "my-unique-key-001"
  }'

# Process payment for the booking
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "uuid-of-booking",
    "amount": 150.00,
    "currency": "USD",
    "paymentMethodId": "pm_card_visa"
  }'
```

---

### 4. Generate a Trip Itinerary

```bash
TOKEN="eyJ..."

# Step 1: parse natural language
curl -X POST http://localhost:3000/trip-planner/parse \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"naturalLanguageInput": "3-day food and culture trip in Tokyo, budget $500"}'
# → { "destination": "Tokyo", "duration": 3, "budget": 500, "interests": ["food","culture"] }

# Step 2: generate itinerary from parsed parameters
curl -X POST http://localhost:3000/trip-planner/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "destination": "Tokyo",
      "duration": 3,
      "budget": 500,
      "interests": ["food", "culture"]
    }
  }'

# Step 3: modify the itinerary
curl -X PUT http://localhost:3000/trip-planner/itineraries/<itinerary-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"modification": "Add a sushi-making class on day 2"}'
```

---

### 5. Submit a Review

```bash
TOKEN="eyJ..."

# Submit review (booking must be in 'completed' status)
curl -X POST http://localhost:3000/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "uuid-of-completed-booking",
    "rating": 5,
    "comment": "Incredible experience, highly recommend!"
  }'

# Read reviews for an experience
curl "http://localhost:3000/experiences/<experience-id>/reviews?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```
