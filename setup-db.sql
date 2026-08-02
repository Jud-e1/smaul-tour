-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255),
  "role" VARCHAR(20) NOT NULL CHECK (role IN ('traveler', 'guide', 'admin')),
  "verified" BOOLEAN DEFAULT FALSE,
  "locked" BOOLEAN DEFAULT FALSE,
  "lockout_until" TIMESTAMP,
  "failed_login_attempts" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "first_name" VARCHAR(100),
  "last_name" VARCHAR(100),
  "profile_photo_url" TEXT,
  "bio" TEXT,
  "phone" VARCHAR(20),
  "preferred_currency" VARCHAR(3) DEFAULT 'USD',
  "preferred_language" VARCHAR(5) DEFAULT 'en',
  "travel_preferences" JSONB,
  "guide_verification_status" VARCHAR(20) CHECK (guide_verification_status IN ('pending', 'approved', 'rejected')),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create experiences table
CREATE TABLE IF NOT EXISTS "experiences" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "guide_id" uuid NOT NULL REFERENCES "users"("id"),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "location_address" TEXT NOT NULL,
  "location_lat" DECIMAL(10, 8) NOT NULL,
  "location_lng" DECIMAL(11, 8) NOT NULL,
  "duration_hours" DECIMAL(4, 2) NOT NULL,
  "price_amount" DECIMAL(10, 2) NOT NULL,
  "price_currency" VARCHAR(3) NOT NULL,
  "category" VARCHAR(50)[] NOT NULL,
  "primary_image_id" uuid,
  "status" VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('active', 'inactive', 'pending_approval')),
  "average_rating" DECIMAL(3, 2) DEFAULT 0,
  "review_count" INTEGER DEFAULT 0,
  "cancellation_policy" VARCHAR(20) DEFAULT 'moderate' CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_experiences_guide_id" ON "experiences"("guide_id");
CREATE INDEX IF NOT EXISTS "idx_experiences_status" ON "experiences"("status");
CREATE INDEX IF NOT EXISTS "idx_experiences_category" ON "experiences" USING GIN("category");
CREATE INDEX IF NOT EXISTS "idx_experiences_location" ON "experiences" USING GIST(ll_to_earth("location_lat", "location_lng"));

-- Create images table
CREATE TABLE IF NOT EXISTS "images" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "thumbnail_url" TEXT NOT NULL,
  "medium_url" TEXT NOT NULL,
  "original_filename" VARCHAR(255),
  "size_bytes" INTEGER NOT NULL,
  "uploaded_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_images_experience_id" ON "images"("experience_id");

-- Create availability_slots table
CREATE TABLE IF NOT EXISTS "availability_slots" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "capacity" INTEGER NOT NULL,
  "booked" INTEGER DEFAULT 0,
  "status" VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  "created_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("experience_id", "date", "start_time")
);

CREATE INDEX IF NOT EXISTS "idx_availability_experience_date" ON "availability_slots"("experience_id", "date");

-- Create bookings table
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_number" VARCHAR(8) UNIQUE NOT NULL,
  "traveler_id" uuid NOT NULL REFERENCES "users"("id"),
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id"),
  "guide_id" uuid NOT NULL REFERENCES "users"("id"),
  "date" DATE NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "participants" INTEGER DEFAULT 1,
  "total_amount" DECIMAL(10, 2) NOT NULL,
  "total_currency" VARCHAR(3) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  "cancellation_policy" VARCHAR(20) NOT NULL,
  "payment_id" uuid,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "cancelled_at" TIMESTAMP,
  "cancellation_reason" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_bookings_traveler_id" ON "bookings"("traveler_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_guide_id" ON "bookings"("guide_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_experience_id" ON "bookings"("experience_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "idx_bookings_date" ON "bookings"("date");

-- Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id"),
  "traveler_id" uuid NOT NULL REFERENCES "users"("id"),
  "guide_id" uuid NOT NULL REFERENCES "users"("id"),
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'escrowed', 'released', 'refunded', 'failed')),
  "payment_method" VARCHAR(20) NOT NULL,
  "gateway_transaction_id" VARCHAR(255),
  "receipt_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "escrowed_at" TIMESTAMP,
  "released_at" TIMESTAMP,
  "refunded_at" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_payments_booking_id" ON "payments"("booking_id");
CREATE INDEX IF NOT EXISTS "idx_payments_traveler_id" ON "payments"("traveler_id");
CREATE INDEX IF NOT EXISTS "idx_payments_guide_id" ON "payments"("guide_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments"("status");

-- Create transaction_logs table
CREATE TABLE IF NOT EXISTS "transaction_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "payment_id" uuid NOT NULL REFERENCES "payments"("id"),
  "action" VARCHAR(20) NOT NULL,
  "previous_status" VARCHAR(20),
  "new_status" VARCHAR(20) NOT NULL,
  "amount" DECIMAL(10, 2),
  "currency" VARCHAR(3),
  "metadata" JSONB,
  "timestamp" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_transaction_logs_payment_id" ON "transaction_logs"("payment_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_logs_timestamp" ON "transaction_logs"("timestamp");

-- Create reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "booking_id" uuid UNIQUE NOT NULL REFERENCES "bookings"("id"),
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id"),
  "traveler_id" uuid NOT NULL REFERENCES "users"("id"),
  "guide_id" uuid NOT NULL REFERENCES "users"("id"),
  "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "comment" TEXT CHECK (LENGTH(comment) <= 1000),
  "status" VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'removed')),
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_reviews_experience_id" ON "reviews"("experience_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_guide_id" ON "reviews"("guide_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_status" ON "reviews"("status");

-- Create itineraries table
CREATE TABLE IF NOT EXISTS "itineraries" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "parameters" JSONB NOT NULL,
  "total_cost_amount" DECIMAL(10, 2),
  "total_cost_currency" VARCHAR(3),
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_itineraries_user_id" ON "itineraries"("user_id");

-- Create itinerary_experiences table
CREATE TABLE IF NOT EXISTS "itinerary_experiences" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "itinerary_id" uuid NOT NULL REFERENCES "itineraries"("id") ON DELETE CASCADE,
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id"),
  "relevance_score" DECIMAL(3, 2),
  "suggested_date" DATE,
  "reasoning" TEXT,
  "position" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_itinerary_experiences_itinerary_id" ON "itinerary_experiences"("itinerary_id");

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" VARCHAR(50) NOT NULL,
  "channels" VARCHAR(20)[] NOT NULL,
  "priority" VARCHAR(10) DEFAULT 'normal',
  "subject" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "status" VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  "created_at" TIMESTAMP DEFAULT NOW(),
  "sent_at" TIMESTAMP,
  "read_at" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications"("status");

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS "verification_requests" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "guide_id" uuid NOT NULL REFERENCES "users"("id"),
  "status" VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" TIMESTAMP,
  "rejection_reason" TEXT,
  "submitted_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_verification_requests_guide_id" ON "verification_requests"("guide_id");
CREATE INDEX IF NOT EXISTS "idx_verification_requests_status" ON "verification_requests"("status");

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS "verification_documents" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "verification_request_id" uuid NOT NULL REFERENCES "verification_requests"("id") ON DELETE CASCADE,
  "type" VARCHAR(50) NOT NULL,
  "url" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_verification_documents_request_id" ON "verification_documents"("verification_request_id");

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "admin_id" uuid NOT NULL REFERENCES "users"("id"),
  "action" VARCHAR(100) NOT NULL,
  "resource_type" VARCHAR(50) NOT NULL,
  "resource_id" uuid NOT NULL,
  "changes" JSONB,
  "timestamp" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_admin_id" ON "audit_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs"("resource_type", "resource_id");

-- TypeORM migrations tracking table
CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL PRIMARY KEY,
  "timestamp" BIGINT NOT NULL,
  "name" VARCHAR(255) NOT NULL
);

-- Mark the migration as already run
INSERT INTO "migrations" ("timestamp", "name")
SELECT 1700000000000, 'InitialSchema1700000000000'
WHERE NOT EXISTS (
  SELECT 1 FROM "migrations" WHERE "name" = 'InitialSchema1700000000000'
);
