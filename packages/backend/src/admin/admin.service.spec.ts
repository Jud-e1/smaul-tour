import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminService } from './admin.service';
import { User, UserRole } from '../database/entities/user.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { Experience, ExperienceStatus } from '../database/entities/experience.entity';
import { Booking } from '../database/entities/booking.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../database/entities/payment.entity';
import { Review } from '../database/entities/review.entity';
import {
  VerificationRequest,
  VerificationStatus,
} from '../database/entities/verification-request.entity';
import { VerificationDocument } from '../database/entities/verification-document.entity';
import { AuditLog } from '../database/entities/audit-log.entity';

// ─── Mock factories ──────────────────────────────────────────────────────────

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockDataSource = () => ({
  transaction: jest.fn(),
});

// ─── Entity helpers ──────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash',
    role: UserRole.GUIDE,
    verified: false,
    locked: false,
    lockoutUntil: null,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: null,
    experiences: [],
    bookingsAsTraveler: [],
    bookingsAsGuide: [],
    reviews: [],
    notifications: [],
    ...overrides,
  } as unknown as User;
}

function makeVerificationRequest(
  overrides: Partial<VerificationRequest> = {}
): VerificationRequest {
  return {
    id: 'vr-1',
    guideId: 'guide-1',
    status: VerificationStatus.PENDING,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    submittedAt: new Date(),
    documents: [],
    guide: null,
    reviewer: null,
    ...overrides,
  } as unknown as VerificationRequest;
}

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 'exp-1',
    guideId: 'guide-1',
    title: 'City Tour',
    description: 'A great tour',
    locationAddress: '123 Main St',
    locationLat: 40.7128,
    locationLng: -74.006,
    durationHours: 2,
    priceAmount: 50,
    priceCurrency: 'USD',
    category: ['culture'],
    primaryImageId: null,
    status: ExperienceStatus.PENDING_APPROVAL,
    averageRating: 4.5,
    reviewCount: 10,
    cancellationPolicy: 'moderate' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
    availabilitySlots: [],
    bookings: [],
    reviews: [],
    guide: null,
    ...overrides,
  } as unknown as Experience;
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    bookingId: 'book-1',
    travelerId: 'traveler-1',
    guideId: 'guide-1',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.ESCROWED,
    paymentMethod: PaymentMethod.CARD,
    gatewayTransactionId: 'pi_test',
    receiptUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    escrowedAt: new Date(),
    releasedAt: null,
    refundedAt: null,
    booking: null,
    traveler: null,
    guide: null,
    transactionLogs: [],
    ...overrides,
  } as unknown as Payment;
}

function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    adminId: 'admin-1',
    action: 'approve_verification',
    resourceType: 'verification_request',
    resourceId: 'vr-1',
    changes: {},
    timestamp: new Date(),
    admin: null,
    ...overrides,
  } as unknown as AuditLog;
}

// ─── Module builder ──────────────────────────────────────────────────────────

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      AdminService,
      { provide: getRepositoryToken(User), useFactory: mockRepo },
      { provide: getRepositoryToken(UserProfile), useFactory: mockRepo },
      { provide: getRepositoryToken(Experience), useFactory: mockRepo },
      { provide: getRepositoryToken(Booking), useFactory: mockRepo },
      { provide: getRepositoryToken(Payment), useFactory: mockRepo },
      { provide: getRepositoryToken(Review), useFactory: mockRepo },
      { provide: getRepositoryToken(VerificationRequest), useFactory: mockRepo },
      { provide: getRepositoryToken(VerificationDocument), useFactory: mockRepo },
      { provide: getRepositoryToken(AuditLog), useFactory: mockRepo },
      { provide: DataSource, useFactory: mockDataSource },
    ],
  }).compile();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminService - approveVerification', () => {
  let service: AdminService;
  let verificationRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    verificationRepo = module.get(getRepositoryToken(VerificationRequest));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));
    dataSource = module.get(DataSource);

    auditLogRepo.create.mockReturnValue({});
    auditLogRepo.save.mockResolvedValue({});
  });

  it('approves a pending verification request and logs the action', async () => {
    const request = makeVerificationRequest();
    verificationRepo.findOne.mockResolvedValue(request);
    dataSource.transaction.mockImplementation((cb: (m: any) => Promise<void>) =>
      cb({ update: jest.fn().mockResolvedValue({}) })
    );

    await service.approveVerification('vr-1', 'admin-1');

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(auditLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-1',
        action: 'approve_verification',
        resourceType: 'verification_request',
        resourceId: 'vr-1',
      })
    );
    expect(auditLogRepo.save).toHaveBeenCalled();
  });

  it('throws NotFoundException when request does not exist', async () => {
    verificationRepo.findOne.mockResolvedValue(null);
    await expect(service.approveVerification('nonexistent', 'admin-1')).rejects.toThrow(
      NotFoundException
    );
  });

  it('throws BadRequestException when request is already approved', async () => {
    const request = makeVerificationRequest({ status: VerificationStatus.APPROVED });
    verificationRepo.findOne.mockResolvedValue(request);
    await expect(service.approveVerification('vr-1', 'admin-1')).rejects.toThrow(
      BadRequestException
    );
  });
});

describe('AdminService - rejectVerification', () => {
  let service: AdminService;
  let verificationRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    verificationRepo = module.get(getRepositoryToken(VerificationRequest));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));
    dataSource = module.get(DataSource);

    auditLogRepo.create.mockReturnValue({});
    auditLogRepo.save.mockResolvedValue({});
  });

  it('rejects a pending verification request with a reason', async () => {
    const request = makeVerificationRequest();
    verificationRepo.findOne.mockResolvedValue(request);
    dataSource.transaction.mockImplementation((cb: (m: any) => Promise<void>) =>
      cb({ update: jest.fn().mockResolvedValue({}) })
    );

    await service.rejectVerification('vr-1', 'admin-1', 'Documents unclear');

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(auditLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reject_verification',
        changes: expect.objectContaining({ reason: 'Documents unclear' }),
      })
    );
  });

  it('throws NotFoundException when request does not exist', async () => {
    verificationRepo.findOne.mockResolvedValue(null);
    await expect(service.rejectVerification('nonexistent', 'admin-1', 'reason')).rejects.toThrow(
      NotFoundException
    );
  });
});

describe('AdminService - suspendUser', () => {
  let service: AdminService;
  let userRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    userRepo = module.get(getRepositoryToken(User));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));

    auditLogRepo.create.mockReturnValue({});
    auditLogRepo.save.mockResolvedValue({});
  });

  it('suspends an active user and logs the action with reason', async () => {
    const user = makeUser({ locked: false });
    userRepo.findOne.mockResolvedValue(user);
    userRepo.update.mockResolvedValue({});

    await service.suspendUser('user-1', 'admin-1', 'Violation of terms');

    expect(userRepo.update).toHaveBeenCalledWith('user-1', { locked: true });
    expect(auditLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-1',
        action: 'suspend_user',
        resourceType: 'user',
        resourceId: 'user-1',
        changes: expect.objectContaining({ reason: 'Violation of terms' }),
      })
    );
  });

  it('throws NotFoundException when user does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.suspendUser('nonexistent', 'admin-1', 'reason')).rejects.toThrow(
      NotFoundException
    );
  });

  it('throws BadRequestException when user is already suspended', async () => {
    const user = makeUser({ locked: true });
    userRepo.findOne.mockResolvedValue(user);
    await expect(service.suspendUser('user-1', 'admin-1', 'reason')).rejects.toThrow(
      BadRequestException
    );
  });
});

describe('AdminService - unsuspendUser', () => {
  let service: AdminService;
  let userRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    userRepo = module.get(getRepositoryToken(User));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));

    auditLogRepo.create.mockReturnValue({});
    auditLogRepo.save.mockResolvedValue({});
  });

  it('unsuspends a locked user', async () => {
    const user = makeUser({ locked: true });
    userRepo.findOne.mockResolvedValue(user);
    userRepo.update.mockResolvedValue({});

    await service.unsuspendUser('user-1', 'admin-1');

    expect(userRepo.update).toHaveBeenCalledWith('user-1', { locked: false, lockoutUntil: null });
  });

  it('throws BadRequestException when user is not suspended', async () => {
    const user = makeUser({ locked: false });
    userRepo.findOne.mockResolvedValue(user);
    await expect(service.unsuspendUser('user-1', 'admin-1')).rejects.toThrow(BadRequestException);
  });
});

describe('AdminService - getMetrics', () => {
  let service: AdminService;
  let userRepo: ReturnType<typeof mockRepo>;
  let experienceRepo: ReturnType<typeof mockRepo>;
  let bookingRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    userRepo = module.get(getRepositoryToken(User));
    experienceRepo = module.get(getRepositoryToken(Experience));
    bookingRepo = module.get(getRepositoryToken(Booking));
  });

  function setupMocks(bookingStats: {
    totalBookings: string;
    totalRevenue: string;
    avgBookingValue: string;
  }) {
    userRepo.count
      .mockResolvedValueOnce(100) // totalUsers
      .mockResolvedValueOnce(20) // totalGuides
      .mockResolvedValueOnce(80); // totalTravelers
    experienceRepo.count.mockResolvedValue(50);

    const qbMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(bookingStats),
    };
    bookingRepo.createQueryBuilder.mockReturnValue(qbMock);
  }

  it('returns correct aggregated metrics', async () => {
    setupMocks({ totalBookings: '200', totalRevenue: '10000.00', avgBookingValue: '50.00' });

    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const metrics = await service.getMetrics(start, end);

    expect(metrics.totalUsers).toBe(100);
    expect(metrics.totalGuides).toBe(20);
    expect(metrics.totalTravelers).toBe(80);
    expect(metrics.totalExperiences).toBe(50);
    expect(metrics.totalBookings).toBe(200);
    expect(metrics.totalRevenue.amount).toBe(10000);
    expect(metrics.averageBookingValue.amount).toBe(50);
    expect(metrics.period.start).toEqual(start);
    expect(metrics.period.end).toEqual(end);
  });

  it('returns cached metrics on second call within TTL', async () => {
    setupMocks({ totalBookings: '200', totalRevenue: '10000.00', avgBookingValue: '50.00' });

    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');

    await service.getMetrics(start, end);
    await service.getMetrics(start, end); // second call should use cache

    // userRepo.count should only be called 3 times (from first call), not 6
    expect(userRepo.count).toHaveBeenCalledTimes(3);
  });

  it('handles zero bookings gracefully', async () => {
    setupMocks({ totalBookings: '0', totalRevenue: '0', avgBookingValue: '0' });

    const metrics = await service.getMetrics(new Date('2024-01-01'), new Date('2024-12-31'));

    expect(metrics.totalBookings).toBe(0);
    expect(metrics.totalRevenue.amount).toBe(0);
    expect(metrics.averageBookingValue.amount).toBe(0);
  });
});

describe('AdminService - getAuditLogs', () => {
  let service: AdminService;
  let auditLogRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    auditLogRepo = module.get(getRepositoryToken(AuditLog));
  });

  it('returns all audit logs when no filters provided', async () => {
    const logs = [makeAuditLog(), makeAuditLog({ id: 'log-2', action: 'suspend_user' })];
    const qbMock = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(logs),
    };
    auditLogRepo.createQueryBuilder.mockReturnValue(qbMock);

    const result = await service.getAuditLogs();

    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('approve_verification');
  });

  it('filters by adminId when provided', async () => {
    const qbMock = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([makeAuditLog()]),
    };
    auditLogRepo.createQueryBuilder.mockReturnValue(qbMock);

    await service.getAuditLogs({ adminId: 'admin-1' });

    expect(qbMock.andWhere).toHaveBeenCalledWith('al.adminId = :adminId', { adminId: 'admin-1' });
  });

  it('filters by date range when provided', async () => {
    const qbMock = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    auditLogRepo.createQueryBuilder.mockReturnValue(qbMock);

    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    await service.getAuditLogs({ startDate: start, endDate: end });

    expect(qbMock.andWhere).toHaveBeenCalledWith('al.timestamp >= :startDate', {
      startDate: start,
    });
    expect(qbMock.andWhere).toHaveBeenCalledWith('al.timestamp <= :endDate', { endDate: end });
  });
});

describe('AdminService - issueRefund', () => {
  let service: AdminService;
  let paymentRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));

    auditLogRepo.create.mockReturnValue({});
    auditLogRepo.save.mockResolvedValue({});
  });

  it('issues a refund for an escrowed payment', async () => {
    const payment = makePayment({ status: PaymentStatus.ESCROWED });
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.update.mockResolvedValue({});

    await service.issueRefund('pay-1', 'admin-1', 'Disputed transaction');

    expect(paymentRepo.update).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({ status: PaymentStatus.REFUNDED })
    );
    expect(auditLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'issue_refund',
        resourceType: 'payment',
        resourceId: 'pay-1',
      })
    );
  });

  it('throws NotFoundException when payment does not exist', async () => {
    paymentRepo.findOne.mockResolvedValue(null);
    await expect(service.issueRefund('nonexistent', 'admin-1', 'reason')).rejects.toThrow(
      NotFoundException
    );
  });

  it('throws BadRequestException when payment is in pending state', async () => {
    const payment = makePayment({ status: PaymentStatus.PENDING });
    paymentRepo.findOne.mockResolvedValue(payment);
    await expect(service.issueRefund('pay-1', 'admin-1', 'reason')).rejects.toThrow(
      BadRequestException
    );
  });
});

describe('AdminService - approveExperience', () => {
  let service: AdminService;
  let experienceRepo: ReturnType<typeof mockRepo>;
  let auditLogRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(AdminService);
    experienceRepo = module.get(getRepositoryToken(Experience));
    auditLogRepo = module.get(getRepositoryToken(AuditLog));

    auditLogRepo.create.mockReturnValue({});
    auditLogRepo.save.mockResolvedValue({});
  });

  it('approves a pending_approval experience', async () => {
    const experience = makeExperience({ status: ExperienceStatus.PENDING_APPROVAL });
    experienceRepo.findOne.mockResolvedValue(experience);
    experienceRepo.update.mockResolvedValue({});

    await service.approveExperience('exp-1', 'admin-1');

    expect(experienceRepo.update).toHaveBeenCalledWith('exp-1', {
      status: ExperienceStatus.ACTIVE,
    });
  });

  it('throws BadRequestException when experience is already active', async () => {
    const experience = makeExperience({ status: ExperienceStatus.ACTIVE });
    experienceRepo.findOne.mockResolvedValue(experience);
    await expect(service.approveExperience('exp-1', 'admin-1')).rejects.toThrow(
      BadRequestException
    );
  });
});
