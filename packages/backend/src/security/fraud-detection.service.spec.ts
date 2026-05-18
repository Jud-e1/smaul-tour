import { Test, TestingModule } from '@nestjs/testing';
import { FraudDetectionService } from './fraud-detection.service';

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [FraudDetectionService],
  }).compile();
}

// ─── Rate Limiting (guard logic tested via unit tests on the guard) ───────────

describe('RateLimitGuard - unit logic', () => {
  /**
   * The RateLimitGuard uses an in-memory store. We test the core logic
   * by importing the guard directly and exercising its canActivate path
   * through a mock ExecutionContext.
   * Requirements: 24.1, 24.2
   */
  const { RateLimitGuard } = require('./rate-limit.guard');

  function makeContext(overrides: {
    ip?: string;
    userId?: string;
    path?: string;
    headers?: Record<string, string>;
  } = {}) {
    const headers: Record<string, string> = { ...(overrides.headers ?? {}) };
    const req: any = {
      ip: overrides.ip ?? '1.2.3.4',
      socket: { remoteAddress: overrides.ip ?? '1.2.3.4' },
      headers,
      path: overrides.path ?? '/test',
      user: overrides.userId ? { id: overrides.userId } : undefined,
    };
    const res: any = {
      _headers: {} as Record<string, string>,
      setHeader(name: string, value: string) { this._headers[name] = value; },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      res,
    };
  }

  function makeGuard(whitelist = '') {
    const configService = { get: (_key: string, def: string) => def === '' ? whitelist : def };
    return new RateLimitGuard(configService);
  }

  it('allows requests within the unauthenticated limit (100/hour)', () => {
    const guard = makeGuard();
    const ctx = makeContext({ ip: '10.0.0.1' });
    // First 100 requests should pass
    for (let i = 0; i < 100; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('blocks the 101st unauthenticated request and returns 429', () => {
    const guard = makeGuard();
    const ctx = makeContext({ ip: '10.0.0.2' });
    for (let i = 0; i < 100; i++) {
      guard.canActivate(ctx);
    }
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('sets Retry-After header when rate limit is exceeded', () => {
    const guard = makeGuard();
    const ctx = makeContext({ ip: '10.0.0.3' });
    for (let i = 0; i < 100; i++) {
      guard.canActivate(ctx);
    }
    try {
      guard.canActivate(ctx);
    } catch {
      // expected
    }
    expect(ctx.res._headers['Retry-After']).toBeDefined();
    expect(Number(ctx.res._headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('allows authenticated users up to 1000 requests/hour', () => {
    const guard = makeGuard();
    const ctx = makeContext({ ip: '10.0.0.4', userId: 'user-auth-1' });
    for (let i = 0; i < 1000; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('blocks authenticated user on 1001st request', () => {
    const guard = makeGuard();
    const ctx = makeContext({ ip: '10.0.0.5', userId: 'user-auth-2' });
    for (let i = 0; i < 1000; i++) {
      guard.canActivate(ctx);
    }
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('whitelisted admin IP bypasses rate limiting', () => {
    const adminIp = '192.168.1.100';
    const guard = makeGuard(adminIp);
    const ctx = makeContext({ ip: adminIp });
    // Should never throw regardless of request count
    for (let i = 0; i < 200; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('applies exponential backoff on repeated violations', () => {
    const guard = makeGuard();
    const ctx = makeContext({ ip: '10.0.0.6' });

    // Exhaust limit
    for (let i = 0; i < 100; i++) {
      guard.canActivate(ctx);
    }

    // First violation
    try { guard.canActivate(ctx); } catch { /* expected */ }
    const record1 = guard.getRecord('ip:10.0.0.6');
    expect(record1?.violations).toBe(1);
    expect(record1?.backoffUntil).toBeDefined();
  });

  it('tracks requests by user ID for authenticated users (not by IP)', () => {
    const guard = makeGuard();
    // Same IP, different users — each should have their own counter
    const ctx1 = makeContext({ ip: '10.0.0.7', userId: 'user-A' });
    const ctx2 = makeContext({ ip: '10.0.0.7', userId: 'user-B' });

    for (let i = 0; i < 500; i++) {
      guard.canActivate(ctx1);
      guard.canActivate(ctx2);
    }

    const recA = guard.getRecord('user:user-A');
    const recB = guard.getRecord('user:user-B');
    expect(recA?.count).toBe(500);
    expect(recB?.count).toBe(500);
  });
});

// ─── Fraud Detection ──────────────────────────────────────────────────────────

describe('FraudDetectionService - checkMultipleAccountsFromIP', () => {
  /**
   * Requirements: 23.1
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('returns false when fewer than 3 accounts registered from same IP in 24h', async () => {
    service.recordAccountRegistration('1.1.1.1', 'u1');
    service.recordAccountRegistration('1.1.1.1', 'u2');
    expect(await service.checkMultipleAccountsFromIP('1.1.1.1')).toBe(false);
  });

  it('returns true when 3 or more accounts registered from same IP in 24h', async () => {
    service.recordAccountRegistration('2.2.2.2', 'u1');
    service.recordAccountRegistration('2.2.2.2', 'u2');
    service.recordAccountRegistration('2.2.2.2', 'u3');
    expect(await service.checkMultipleAccountsFromIP('2.2.2.2')).toBe(true);
  });

  it('returns false for a different IP', async () => {
    service.recordAccountRegistration('3.3.3.3', 'u1');
    service.recordAccountRegistration('3.3.3.3', 'u2');
    service.recordAccountRegistration('3.3.3.3', 'u3');
    expect(await service.checkMultipleAccountsFromIP('4.4.4.4')).toBe(false);
  });
});

describe('FraudDetectionService - checkRepeatedPaymentFailures', () => {
  /**
   * Requirements: 23.2
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('returns false when fewer than 3 payment failures', async () => {
    service.recordPaymentFailure('user-1');
    service.recordPaymentFailure('user-1');
    expect(await service.checkRepeatedPaymentFailures('user-1')).toBe(false);
  });

  it('returns true when 3 or more payment failures in 24h', async () => {
    service.recordPaymentFailure('user-2');
    service.recordPaymentFailure('user-2');
    service.recordPaymentFailure('user-2');
    expect(await service.checkRepeatedPaymentFailures('user-2')).toBe(true);
  });

  it('returns false for a different user', async () => {
    service.recordPaymentFailure('user-3');
    service.recordPaymentFailure('user-3');
    service.recordPaymentFailure('user-3');
    expect(await service.checkRepeatedPaymentFailures('user-4')).toBe(false);
  });
});

describe('FraudDetectionService - checkUnusualBookingPatterns', () => {
  /**
   * Requirements: 23.3
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('returns false for normal booking activity', async () => {
    service.recordBooking('user-1', 50);
    service.recordBooking('user-1', 75);
    expect(await service.checkUnusualBookingPatterns('user-1')).toBe(false);
  });

  it('returns true when 5 or more bookings in 1 hour', async () => {
    for (let i = 0; i < 5; i++) {
      service.recordBooking('user-2', 50);
    }
    expect(await service.checkUnusualBookingPatterns('user-2')).toBe(true);
  });

  it('returns true when 3 or more high-value bookings (>=500) in 1 hour', async () => {
    service.recordBooking('user-3', 600);
    service.recordBooking('user-3', 750);
    service.recordBooking('user-3', 500);
    expect(await service.checkUnusualBookingPatterns('user-3')).toBe(true);
  });
});

describe('FraudDetectionService - checkGuideCancellations', () => {
  /**
   * Requirements: 23.4
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('returns false when fewer than 3 cancellations in 7 days', async () => {
    service.recordGuideCancellation('guide-1');
    service.recordGuideCancellation('guide-1');
    expect(await service.checkGuideCancellations('guide-1')).toBe(false);
  });

  it('returns true when 3 or more cancellations in 7 days', async () => {
    service.recordGuideCancellation('guide-2');
    service.recordGuideCancellation('guide-2');
    service.recordGuideCancellation('guide-2');
    expect(await service.checkGuideCancellations('guide-2')).toBe(true);
  });
});

describe('FraudDetectionService - blocklist', () => {
  /**
   * Requirements: 23.6
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('adds an email to the blocklist and detects it', async () => {
    await service.addToBlocklist('email', 'fraud@example.com');
    expect(await service.isBlocked('email', 'fraud@example.com')).toBe(true);
  });

  it('adds a card to the blocklist and detects it', async () => {
    await service.addToBlocklist('card', '4111111111111111');
    expect(await service.isBlocked('card', '4111111111111111')).toBe(true);
  });

  it('returns false for non-blocked values', async () => {
    expect(await service.isBlocked('email', 'legit@example.com')).toBe(false);
    expect(await service.isBlocked('card', '9999999999999999')).toBe(false);
  });

  it('is case-insensitive for email matching', async () => {
    await service.addToBlocklist('email', 'FRAUD@EXAMPLE.COM');
    expect(await service.isBlocked('email', 'fraud@example.com')).toBe(true);
  });
});

describe('FraudDetectionService - device fingerprinting', () => {
  /**
   * Requirements: 23.5
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('returns false when fingerprint is only seen on current user', () => {
    service.recordDeviceFingerprint('user-1', 'fp-abc123');
    expect(service.checkDeviceFingerprint('fp-abc123', 'user-1')).toBe(false);
  });

  it('returns true when fingerprint was seen on a different user', () => {
    service.recordDeviceFingerprint('user-1', 'fp-shared');
    expect(service.checkDeviceFingerprint('fp-shared', 'user-2')).toBe(true);
  });

  it('returns false for an unseen fingerprint', () => {
    expect(service.checkDeviceFingerprint('fp-unknown', 'user-3')).toBe(false);
  });
});

describe('FraudDetectionService - runAllChecks', () => {
  /**
   * Requirements: 23.7
   */
  let service: FraudDetectionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(FraudDetectionService);
  });

  it('returns not flagged for clean user', async () => {
    const result = await service.runAllChecks('clean-user', '5.5.5.5');
    expect(result.flagged).toBe(false);
  });

  it('flags user when multiple accounts from same IP', async () => {
    service.recordAccountRegistration('6.6.6.6', 'u1');
    service.recordAccountRegistration('6.6.6.6', 'u2');
    service.recordAccountRegistration('6.6.6.6', 'u3');
    const result = await service.runAllChecks('u3', '6.6.6.6');
    expect(result.flagged).toBe(true);
    expect(result.reason).toContain('IP');
  });

  it('flags user with repeated payment failures', async () => {
    service.recordPaymentFailure('pf-user');
    service.recordPaymentFailure('pf-user');
    service.recordPaymentFailure('pf-user');
    const result = await service.runAllChecks('pf-user', '7.7.7.7');
    expect(result.flagged).toBe(true);
    expect(result.reason).toContain('payment');
  });
});

// ─── Input Validation (via class-validator DTOs) ──────────────────────────────

describe('AddToBlocklistDto - input validation', () => {
  /**
   * Requirements: 16.4
   */
  const { validate } = require('class-validator');
  const { plainToInstance } = require('class-transformer');
  const { AddToBlocklistDto } = require('./dto/blocklist.dto');

  it('passes validation for valid email blocklist entry', async () => {
    const dto = plainToInstance(AddToBlocklistDto, { type: 'email', value: 'bad@example.com' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation for valid card blocklist entry', async () => {
    const dto = plainToInstance(AddToBlocklistDto, { type: 'card', value: '4111111111111111' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation for invalid type', async () => {
    const dto = plainToInstance(AddToBlocklistDto, { type: 'phone', value: '123' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails validation for empty value', async () => {
    const dto = plainToInstance(AddToBlocklistDto, { type: 'email', value: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
