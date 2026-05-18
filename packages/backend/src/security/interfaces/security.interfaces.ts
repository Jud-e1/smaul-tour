export interface RateLimitRecord {
  count: number;
  windowStart: number;
  violations: number;
  backoffUntil?: number;
}

export interface RateLimitConfig {
  unauthenticatedLimit: number; // requests per hour per IP
  authenticatedLimit: number;   // requests per hour per user
  windowMs: number;             // window size in ms
  adminWhitelist: string[];     // IPs exempt from rate limiting
}

export interface RateLimitViolation {
  identifier: string;
  type: 'ip' | 'user';
  timestamp: Date;
  requestCount: number;
  limit: number;
  endpoint: string;
}

export interface FraudCheckResult {
  flagged: boolean;
  reason?: string;
}

export interface BlocklistEntry {
  type: 'email' | 'card';
  value: string;
  addedAt: Date;
  reason?: string;
}

export interface AccountRegistrationRecord {
  ip: string;
  userId: string;
  createdAt: Date;
}

export interface PaymentFailureRecord {
  userId: string;
  failedAt: Date;
  amount?: number;
}

export interface BookingRecord {
  userId: string;
  amount: number;
  createdAt: Date;
}

export interface CancellationRecord {
  guideId: string;
  cancelledAt: Date;
}

export interface DeviceFingerprint {
  userId: string;
  fingerprint: string;
  firstSeen: Date;
  lastSeen: Date;
}
