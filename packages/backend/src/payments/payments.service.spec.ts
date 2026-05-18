import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService, calculateRefundAmount } from './payments.service';
import { StripeGatewayService } from './stripe-gateway.service';
import { ReceiptService } from './receipt.service';
import { Payment as PaymentEntity, PaymentStatus, PaymentMethod } from '../database/entities/payment.entity';
import { TransactionLog as TransactionLogEntity, TransactionAction } from '../database/entities/transaction-log.entity';
import { RefundRequest, isValidPaymentTransition } from './interfaces/payment.interfaces';

const mockPaymentRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockTransactionLogRepo = () => ({
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockStripeGateway = () => ({
  createPaymentIntent: jest.fn(),
  confirmPaymentIntent: jest.fn(),
  createRefund: jest.fn(),
});

const mockReceiptService = () => ({
  generateReceiptPdf: jest.fn().mockReturnValue(Buffer.from('pdf')),
});

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return {
    id: 'pay-1',
    bookingId: 'book-1',
    travelerId: 'traveler-1',
    guideId: 'guide-1',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.ESCROWED,
    paymentMethod: PaymentMethod.CARD,
    gatewayTransactionId: 'pi_test_123',
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
  } as unknown as PaymentEntity;
}

function makeModule() {
  return Test.createTestingModule({
    providers: [
      PaymentsService,
      { provide: getRepositoryToken(PaymentEntity), useFactory: mockPaymentRepo },
      { provide: getRepositoryToken(TransactionLogEntity), useFactory: mockTransactionLogRepo },
      { provide: StripeGatewayService, useFactory: mockStripeGateway },
      { provide: ReceiptService, useFactory: mockReceiptService },
    ],
  }).compile();
}

describe('PaymentsService - refundPayment', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof mockPaymentRepo>;
  let transactionLogRepo: ReturnType<typeof mockTransactionLogRepo>;
  let stripeGateway: ReturnType<typeof mockStripeGateway>;

  beforeEach(async () => {
    const module: TestingModule = await makeModule();

    service = module.get(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(PaymentEntity));
    transactionLogRepo = module.get(getRepositoryToken(TransactionLogEntity));
    stripeGateway = module.get(StripeGatewayService);
  });

  it('calls Stripe createRefund with the gateway transaction ID and amount', async () => {
    const payment = makePayment();
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.save.mockResolvedValue({ ...payment, status: PaymentStatus.REFUNDED, refundedAt: new Date() });
    stripeGateway.createRefund.mockResolvedValue({ refundId: 're_test_abc', status: 'succeeded', amount: 100 });
    transactionLogRepo.create.mockReturnValue({});
    transactionLogRepo.save.mockResolvedValue({});

    const request: RefundRequest = {
      paymentId: 'pay-1',
      amount: { amount: 100, currency: 'USD' },
      reason: 'customer request',
    };

    await service.refundPayment(request);

    expect(stripeGateway.createRefund).toHaveBeenCalledWith('pi_test_123', 100);
  });

  it('stores the Stripe refund ID in the transaction log metadata', async () => {
    const payment = makePayment();
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.save.mockResolvedValue({ ...payment, status: PaymentStatus.REFUNDED });
    stripeGateway.createRefund.mockResolvedValue({ refundId: 're_test_abc', status: 'succeeded', amount: 100 });
    transactionLogRepo.create.mockReturnValue({});
    transactionLogRepo.save.mockResolvedValue({});

    await service.refundPayment({ paymentId: 'pay-1', amount: { amount: 100, currency: 'USD' }, reason: 'test' });

    expect(transactionLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ stripeRefundId: 're_test_abc' }),
      }),
    );
  });

  it('throws when Stripe refund fails and does not update DB status', async () => {
    const payment = makePayment();
    paymentRepo.findOne.mockResolvedValue(payment);
    stripeGateway.createRefund.mockRejectedValue(new Error('Stripe error'));

    await expect(
      service.refundPayment({ paymentId: 'pay-1', amount: { amount: 100, currency: 'USD' }, reason: 'test' }),
    ).rejects.toThrow('Stripe error');

    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when payment is not in escrowed state', async () => {
    const payment = makePayment({ status: PaymentStatus.PENDING });
    paymentRepo.findOne.mockResolvedValue(payment);

    await expect(
      service.refundPayment({ paymentId: 'pay-1', amount: { amount: 100, currency: 'USD' }, reason: 'test' }),
    ).rejects.toThrow(BadRequestException);

    expect(stripeGateway.createRefund).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when payment does not exist', async () => {
    paymentRepo.findOne.mockResolvedValue(null);

    await expect(
      service.refundPayment({ paymentId: 'nonexistent', amount: { amount: 50, currency: 'USD' }, reason: 'test' }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('calculateRefundAmount (standalone)', () => {
  describe('flexible policy', () => {
    it('returns 100% refund when >= 1 day before', () => {
      expect(calculateRefundAmount(200, 'flexible', 1)).toEqual({ refundAmount: 200, refundPercentage: 100 });
      expect(calculateRefundAmount(200, 'flexible', 5)).toEqual({ refundAmount: 200, refundPercentage: 100 });
    });

    it('returns 50% refund when < 1 day before', () => {
      expect(calculateRefundAmount(200, 'flexible', 0)).toEqual({ refundAmount: 100, refundPercentage: 50 });
    });
  });

  describe('moderate policy', () => {
    it('returns 100% refund when >= 7 days before', () => {
      expect(calculateRefundAmount(100, 'moderate', 7)).toEqual({ refundAmount: 100, refundPercentage: 100 });
      expect(calculateRefundAmount(100, 'moderate', 14)).toEqual({ refundAmount: 100, refundPercentage: 100 });
    });

    it('returns 50% refund when < 7 days before', () => {
      expect(calculateRefundAmount(100, 'moderate', 6)).toEqual({ refundAmount: 50, refundPercentage: 50 });
      expect(calculateRefundAmount(100, 'moderate', 0)).toEqual({ refundAmount: 50, refundPercentage: 50 });
    });
  });

  describe('strict policy', () => {
    it('returns 100% refund when >= 14 days before', () => {
      expect(calculateRefundAmount(80, 'strict', 14)).toEqual({ refundAmount: 80, refundPercentage: 100 });
      expect(calculateRefundAmount(80, 'strict', 30)).toEqual({ refundAmount: 80, refundPercentage: 100 });
    });

    it('returns 50% refund when < 14 days before', () => {
      expect(calculateRefundAmount(80, 'strict', 13)).toEqual({ refundAmount: 40, refundPercentage: 50 });
      expect(calculateRefundAmount(80, 'strict', 0)).toEqual({ refundAmount: 40, refundPercentage: 50 });
    });
  });
});

describe('PaymentsService.calculateRefundAmount (method)', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await makeModule();
    service = module.get(PaymentsService);
  });

  it('delegates to the standalone function', () => {
    expect(service.calculateRefundAmount(150, 'moderate', 10)).toEqual({ refundAmount: 150, refundPercentage: 100 });
    expect(service.calculateRefundAmount(150, 'moderate', 3)).toEqual({ refundAmount: 75, refundPercentage: 50 });
  });
});

// ─── processPayment ──────────────────────────────────────────────────────────

describe('PaymentsService - processPayment', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof mockPaymentRepo>;
  let transactionLogRepo: ReturnType<typeof mockTransactionLogRepo>;
  let stripeGateway: ReturnType<typeof mockStripeGateway>;

  const baseRequest = {
    bookingId: 'book-1',
    travelerId: 'traveler-1',
    guideId: 'guide-1',
    amount: { amount: 100, currency: 'USD' },
    paymentMethodId: 'pm_test',
    returnUrl: 'https://example.com/return',
  };

  beforeEach(async () => {
    const module: TestingModule = await makeModule();
    service = module.get(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(PaymentEntity));
    transactionLogRepo = module.get(getRepositoryToken(TransactionLogEntity));
    stripeGateway = module.get(StripeGatewayService);

    transactionLogRepo.create.mockReturnValue({});
    transactionLogRepo.save.mockResolvedValue({});
  });

  it('successful flow: returns escrowed payment with success=true', async () => {
    const created = makePayment({ status: PaymentStatus.PENDING });
    paymentRepo.create.mockReturnValue(created);
    // save is called multiple times; return progressively updated states
    paymentRepo.save
      .mockResolvedValueOnce({ ...created, gatewayTransactionId: 'pi_123' })
      .mockResolvedValueOnce({ ...created, status: PaymentStatus.AUTHORIZED })
      .mockResolvedValueOnce({ ...created, status: PaymentStatus.CAPTURED })
      .mockResolvedValueOnce({ ...created, status: PaymentStatus.ESCROWED, escrowedAt: new Date() })
      .mockResolvedValueOnce({ ...created, status: PaymentStatus.ESCROWED, receiptUrl: 'receipts/pay-1' });

    stripeGateway.createPaymentIntent.mockResolvedValue({
      paymentIntentId: 'pi_123',
      clientSecret: 'secret',
      status: 'succeeded',
    });

    const result = await service.processPayment(baseRequest);

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBeUndefined();
    expect(result.payment.status).toBe('escrowed');
  });

  it('3DS redirect flow: returns redirectUrl and authorized status', async () => {
    const created = makePayment({ status: PaymentStatus.PENDING });
    paymentRepo.create.mockReturnValue(created);
    paymentRepo.save.mockResolvedValue({ ...created, status: PaymentStatus.AUTHORIZED });

    stripeGateway.createPaymentIntent.mockResolvedValue({
      paymentIntentId: 'pi_3ds',
      clientSecret: 'secret',
      status: 'requires_action',
      nextActionUrl: 'https://stripe.com/3ds',
    });

    const result = await service.processPayment(baseRequest);

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBe('https://stripe.com/3ds');
    expect(result.payment.status).toBe('authorized');
  });

  it('failure: returns success=false and failed status when Stripe throws', async () => {
    const created = makePayment({ status: PaymentStatus.PENDING });
    paymentRepo.create.mockReturnValue(created);
    paymentRepo.save.mockResolvedValue({ ...created, status: PaymentStatus.FAILED });

    stripeGateway.createPaymentIntent.mockRejectedValue(new Error('Card declined'));

    const result = await service.processPayment(baseRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Card declined');
    expect(result.payment.status).toBe('failed');
  });
});

// ─── escrowFunds ─────────────────────────────────────────────────────────────

describe('PaymentsService - escrowFunds', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof mockPaymentRepo>;
  let transactionLogRepo: ReturnType<typeof mockTransactionLogRepo>;

  beforeEach(async () => {
    const module: TestingModule = await makeModule();
    service = module.get(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(PaymentEntity));
    transactionLogRepo = module.get(getRepositoryToken(TransactionLogEntity));
    transactionLogRepo.create.mockReturnValue({});
    transactionLogRepo.save.mockResolvedValue({});
  });

  it('transitions captured → escrowed and sets escrowedAt', async () => {
    const payment = makePayment({ status: PaymentStatus.CAPTURED });
    const escrowed = { ...payment, status: PaymentStatus.ESCROWED, escrowedAt: new Date() };
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.save.mockResolvedValue(escrowed);

    const result = await service.escrowFunds('pay-1');

    expect(result.status).toBe('escrowed');
    expect(result.escrowedAt).toBeDefined();
  });

  it('throws BadRequestException when payment is not in captured state', async () => {
    const payment = makePayment({ status: PaymentStatus.PENDING });
    paymentRepo.findOne.mockResolvedValue(payment);

    await expect(service.escrowFunds('pay-1')).rejects.toThrow(BadRequestException);
  });
});

// ─── releaseFunds ─────────────────────────────────────────────────────────────

describe('PaymentsService - releaseFunds', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof mockPaymentRepo>;
  let transactionLogRepo: ReturnType<typeof mockTransactionLogRepo>;

  beforeEach(async () => {
    const module: TestingModule = await makeModule();
    service = module.get(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(PaymentEntity));
    transactionLogRepo = module.get(getRepositoryToken(TransactionLogEntity));
    transactionLogRepo.create.mockReturnValue({});
    transactionLogRepo.save.mockResolvedValue({});
  });

  it('transitions escrowed → released and sets releasedAt', async () => {
    const payment = makePayment({ status: PaymentStatus.ESCROWED });
    const released = { ...payment, status: PaymentStatus.RELEASED, releasedAt: new Date() };
    paymentRepo.findOne.mockResolvedValue(payment);
    paymentRepo.save.mockResolvedValue(released);

    const result = await service.releaseFunds('pay-1');

    expect(result.status).toBe('released');
    expect(result.releasedAt).toBeDefined();
  });

  it('throws BadRequestException when payment is not in escrowed state', async () => {
    const payment = makePayment({ status: PaymentStatus.CAPTURED });
    paymentRepo.findOne.mockResolvedValue(payment);

    await expect(service.releaseFunds('pay-1')).rejects.toThrow(BadRequestException);
  });
});

// ─── isValidPaymentTransition ─────────────────────────────────────────────────

describe('isValidPaymentTransition', () => {
  it('allows pending → authorized', () => {
    expect(isValidPaymentTransition('pending', 'authorized')).toBe(true);
  });

  it('allows authorized → captured', () => {
    expect(isValidPaymentTransition('authorized', 'captured')).toBe(true);
  });

  it('allows captured → escrowed', () => {
    expect(isValidPaymentTransition('captured', 'escrowed')).toBe(true);
  });

  it('allows escrowed → released', () => {
    expect(isValidPaymentTransition('escrowed', 'released')).toBe(true);
  });

  it('allows escrowed → refunded', () => {
    expect(isValidPaymentTransition('escrowed', 'refunded')).toBe(true);
  });

  it('allows any → failed from pending', () => {
    expect(isValidPaymentTransition('pending', 'failed')).toBe(true);
  });

  it('rejects pending → escrowed (skipping steps)', () => {
    expect(isValidPaymentTransition('pending', 'escrowed')).toBe(false);
  });

  it('rejects released → refunded (terminal state)', () => {
    expect(isValidPaymentTransition('released', 'refunded')).toBe(false);
  });

  it('rejects refunded → released (terminal state)', () => {
    expect(isValidPaymentTransition('refunded', 'released')).toBe(false);
  });
});
