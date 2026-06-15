import { Injectable, Logger } from '@nestjs/common';
import {
  AccountRegistrationRecord,
  BlocklistEntry,
  BookingRecord,
  CancellationRecord,
  DeviceFingerprint,
  FraudCheckResult,
  PaymentFailureRecord,
} from './interfaces/security.interfaces';

// Thresholds
const MULTI_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MULTI_ACCOUNT_THRESHOLD = 3; // 3+ accounts from same IP in 24h

const PAYMENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAYMENT_FAILURE_THRESHOLD = 3;

const UNUSUAL_BOOKING_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const UNUSUAL_BOOKING_COUNT_THRESHOLD = 5;
const UNUSUAL_BOOKING_VALUE_THRESHOLD = 500; // USD

const GUIDE_CANCELLATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const GUIDE_CANCELLATION_THRESHOLD = 3;

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  // In-memory stores (production: use Redis/DB)
  private readonly registrationsByIp = new Map<string, AccountRegistrationRecord[]>();
  private readonly paymentFailures = new Map<string, PaymentFailureRecord[]>();
  private readonly bookingRecords = new Map<string, BookingRecord[]>();
  private readonly cancellationRecords = new Map<string, CancellationRecord[]>();
  private readonly deviceFingerprints = new Map<string, DeviceFingerprint[]>();
  private readonly blocklist = new Map<string, BlocklistEntry>();

  /**
   * Record a new account registration from an IP.
   * Requirements: 23.1
   */
  recordAccountRegistration(ip: string, userId: string): void {
    const records = this.registrationsByIp.get(ip) ?? [];
    records.push({ ip, userId, createdAt: new Date() });
    this.registrationsByIp.set(ip, records);
  }

  /**
   * Check if multiple accounts were created from the same IP within 24 hours.
   * Requirements: 23.1
   */
  async checkMultipleAccountsFromIP(ip: string): Promise<boolean> {
    const records = this.registrationsByIp.get(ip) ?? [];
    const cutoff = Date.now() - MULTI_ACCOUNT_WINDOW_MS;
    const recent = records.filter((r) => r.createdAt.getTime() >= cutoff);
    const flagged = recent.length >= MULTI_ACCOUNT_THRESHOLD;
    if (flagged) {
      this.logger.warn(`Fraud: multiple accounts (${recent.length}) from IP ${ip} within 24h`);
    }
    return flagged;
  }

  /**
   * Record a payment failure for a user.
   * Requirements: 23.2
   */
  recordPaymentFailure(userId: string, amount?: number): void {
    const records = this.paymentFailures.get(userId) ?? [];
    records.push({ userId, failedAt: new Date(), amount });
    this.paymentFailures.set(userId, records);
  }

  /**
   * Check if a user has repeated payment failures.
   * Requirements: 23.2
   */
  async checkRepeatedPaymentFailures(userId: string): Promise<boolean> {
    const records = this.paymentFailures.get(userId) ?? [];
    const cutoff = Date.now() - PAYMENT_FAILURE_WINDOW_MS;
    const recent = records.filter((r) => r.failedAt.getTime() >= cutoff);
    const flagged = recent.length >= PAYMENT_FAILURE_THRESHOLD;
    if (flagged) {
      this.logger.warn(`Fraud: repeated payment failures (${recent.length}) for user ${userId}`);
    }
    return flagged;
  }

  /**
   * Record a booking for fraud pattern analysis.
   * Requirements: 23.3
   */
  recordBooking(userId: string, amount: number): void {
    const records = this.bookingRecords.get(userId) ?? [];
    records.push({ userId, amount, createdAt: new Date() });
    this.bookingRecords.set(userId, records);
  }

  /**
   * Check for unusual booking patterns (multiple high-value bookings in short time).
   * Requirements: 23.3
   */
  async checkUnusualBookingPatterns(userId: string): Promise<boolean> {
    const records = this.bookingRecords.get(userId) ?? [];
    const cutoff = Date.now() - UNUSUAL_BOOKING_WINDOW_MS;
    const recent = records.filter((r) => r.createdAt.getTime() >= cutoff);
    const highValue = recent.filter((r) => r.amount >= UNUSUAL_BOOKING_VALUE_THRESHOLD);

    const flagged = recent.length >= UNUSUAL_BOOKING_COUNT_THRESHOLD || highValue.length >= 3;

    if (flagged) {
      this.logger.warn(
        `Fraud: unusual booking pattern for user ${userId}: ` +
          `${recent.length} bookings in 1h, ${highValue.length} high-value`
      );
    }
    return flagged;
  }

  /**
   * Record a guide cancellation.
   * Requirements: 23.4
   */
  recordGuideCancellation(guideId: string): void {
    const records = this.cancellationRecords.get(guideId) ?? [];
    records.push({ guideId, cancelledAt: new Date() });
    this.cancellationRecords.set(guideId, records);
  }

  /**
   * Check if a guide has multiple cancellations within 7 days.
   * Requirements: 23.4
   */
  async checkGuideCancellations(guideId: string): Promise<boolean> {
    const records = this.cancellationRecords.get(guideId) ?? [];
    const cutoff = Date.now() - GUIDE_CANCELLATION_WINDOW_MS;
    const recent = records.filter((r) => r.cancelledAt.getTime() >= cutoff);
    const flagged = recent.length >= GUIDE_CANCELLATION_THRESHOLD;
    if (flagged) {
      this.logger.warn(`Fraud: guide ${guideId} has ${recent.length} cancellations in 7 days`);
    }
    return flagged;
  }

  /**
   * Record or update a device fingerprint for a user.
   * Requirements: 23.5
   */
  recordDeviceFingerprint(userId: string, fingerprint: string): void {
    const records = this.deviceFingerprints.get(userId) ?? [];
    const existing = records.find((r) => r.fingerprint === fingerprint);
    if (existing) {
      existing.lastSeen = new Date();
    } else {
      records.push({ userId, fingerprint, firstSeen: new Date(), lastSeen: new Date() });
    }
    this.deviceFingerprints.set(userId, records);
  }

  /**
   * Check if a fingerprint is associated with a locked/suspicious account.
   * Returns true if the fingerprint was previously seen on a different user who is flagged.
   * Requirements: 23.5
   */
  checkDeviceFingerprint(fingerprint: string, currentUserId: string): boolean {
    for (const [userId, records] of this.deviceFingerprints.entries()) {
      if (userId !== currentUserId && records.some((r) => r.fingerprint === fingerprint)) {
        this.logger.warn(
          `Fraud: device fingerprint ${fingerprint} used by user ${currentUserId} ` +
            `was previously seen on user ${userId}`
        );
        return true;
      }
    }
    return false;
  }

  /**
   * Add an email or card to the blocklist.
   * Requirements: 23.6
   */
  async addToBlocklist(type: 'email' | 'card', value: string, reason?: string): Promise<void> {
    const key = `${type}:${value.toLowerCase()}`;
    this.blocklist.set(key, { type, value: value.toLowerCase(), addedAt: new Date(), reason });
    this.logger.log(`Blocklist: added ${type} ${value} (reason: ${reason ?? 'none'})`);
  }

  /**
   * Check if an email or card is on the blocklist.
   * Requirements: 23.6
   */
  async isBlocked(type: 'email' | 'card', value: string): Promise<boolean> {
    const key = `${type}:${value.toLowerCase()}`;
    return this.blocklist.has(key);
  }

  /**
   * Run all fraud checks for a user and return aggregated result.
   * Requirements: 23.7
   */
  async runAllChecks(userId: string, ip: string): Promise<FraudCheckResult> {
    const [multiAccount, paymentFailures, unusualBookings] = await Promise.all([
      this.checkMultipleAccountsFromIP(ip),
      this.checkRepeatedPaymentFailures(userId),
      this.checkUnusualBookingPatterns(userId),
    ]);

    if (multiAccount) {
      return { flagged: true, reason: 'Multiple accounts from same IP within 24 hours' };
    }
    if (paymentFailures) {
      return { flagged: true, reason: 'Repeated payment failures' };
    }
    if (unusualBookings) {
      return { flagged: true, reason: 'Unusual booking patterns detected' };
    }

    return { flagged: false };
  }

  /** Exposed for testing */
  clearAll(): void {
    this.registrationsByIp.clear();
    this.paymentFailures.clear();
    this.bookingRecords.clear();
    this.cancellationRecords.clear();
    this.deviceFingerprints.clear();
    this.blocklist.clear();
  }
}
