import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment as PaymentEntity,
  PaymentStatus,
  PaymentMethod,
} from '../database/entities/payment.entity';
import {
  TransactionLog as TransactionLogEntity,
  TransactionAction,
} from '../database/entities/transaction-log.entity';
import {
  Payment,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  TransactionLog,
  IPaymentService,
  isValidPaymentTransition,
} from './interfaces/payment.interfaces';
import { StripeGatewayService } from './stripe-gateway.service';
import { ReceiptService } from './receipt.service';

@Injectable()
export class PaymentsService implements IPaymentService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(TransactionLogEntity)
    private readonly transactionLogRepo: Repository<TransactionLogEntity>,
    private readonly stripeGateway: StripeGatewayService,
    private readonly receiptService: ReceiptService
  ) {}

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logger.log(`Processing payment for booking ${request.bookingId}`);

    // 1. Create payment entity in pending state
    const payment = this.paymentRepo.create({
      bookingId: request.bookingId,
      travelerId: request.travelerId,
      guideId: request.guideId,
      amount: request.amount.amount,
      currency: request.amount.currency,
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CARD,
    });
    const savedPayment = await this.paymentRepo.save(payment);

    try {
      // 2. Call Stripe to create a PaymentIntent
      const intentResult = await this.stripeGateway.createPaymentIntent(
        request.amount.amount,
        request.amount.currency,
        request.paymentMethodId,
        request.returnUrl
      );

      // Store gateway transaction ID
      savedPayment.gatewayTransactionId = intentResult.paymentIntentId;

      // 3. Log authorize transition
      await this.logTransaction(
        savedPayment.id,
        TransactionAction.AUTHORIZE,
        PaymentStatus.PENDING,
        PaymentStatus.AUTHORIZED,
        { gatewayTransactionId: intentResult.paymentIntentId }
      );

      // 4. Handle 3DS redirect — return early with redirectUrl
      if (intentResult.nextActionUrl) {
        savedPayment.status = PaymentStatus.AUTHORIZED;
        await this.paymentRepo.save(savedPayment);

        return {
          success: true,
          payment: this.mapToInterface(savedPayment),
          redirectUrl: intentResult.nextActionUrl,
        };
      }

      // 5. Mark as authorized then captured
      savedPayment.status = PaymentStatus.AUTHORIZED;
      await this.paymentRepo.save(savedPayment);

      await this.logTransaction(
        savedPayment.id,
        TransactionAction.CAPTURE,
        PaymentStatus.AUTHORIZED,
        PaymentStatus.CAPTURED,
        { gatewayTransactionId: intentResult.paymentIntentId }
      );

      savedPayment.status = PaymentStatus.CAPTURED;
      await this.paymentRepo.save(savedPayment);

      // 6. Auto-escrow after capture
      savedPayment.status = PaymentStatus.ESCROWED;
      savedPayment.escrowedAt = new Date();
      await this.paymentRepo.save(savedPayment);

      await this.logTransaction(
        savedPayment.id,
        TransactionAction.ESCROW,
        PaymentStatus.CAPTURED,
        PaymentStatus.ESCROWED,
        { amount: request.amount.amount, currency: request.amount.currency }
      );

      // 7. Generate receipt URL
      const receiptUrl = `receipts/${savedPayment.id}`;
      savedPayment.receiptUrl = receiptUrl;
      const finalPayment = await this.paymentRepo.save(savedPayment);

      this.logger.log(`Payment ${savedPayment.id} successfully escrowed`);

      return {
        success: true,
        payment: this.mapToInterface(finalPayment),
      };
    } catch (error) {
      // 8. Handle failures gracefully
      this.logger.error(`Payment ${savedPayment.id} failed: ${(error as Error).message}`);

      savedPayment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(savedPayment).catch(() => {
        /* best-effort */
      });

      await this.logTransaction(
        savedPayment.id,
        TransactionAction.FAIL,
        PaymentStatus.PENDING,
        PaymentStatus.FAILED,
        { error: (error as Error).message }
      ).catch(() => {
        /* best-effort */
      });

      return {
        success: false,
        payment: this.mapToInterface(savedPayment),
        error: (error as Error).message,
      };
    }
  }

  async confirmPayment(paymentId: string): Promise<PaymentResult> {
    this.logger.log(`Confirming 3DS payment ${paymentId}`);
    const payment = await this.findPaymentOrFail(paymentId);

    if (payment.status !== PaymentStatus.AUTHORIZED) {
      return {
        success: false,
        payment: this.mapToInterface(payment),
        error: `Payment is in status '${payment.status}', expected 'authorized'`,
      };
    }

    try {
      const intentResult = await this.stripeGateway.confirmPaymentIntent(
        payment.gatewayTransactionId
      );

      if (intentResult.nextActionUrl) {
        // Still requires action
        return {
          success: true,
          payment: this.mapToInterface(payment),
          redirectUrl: intentResult.nextActionUrl,
        };
      }

      // Capture
      await this.logTransaction(
        paymentId,
        TransactionAction.CAPTURE,
        PaymentStatus.AUTHORIZED,
        PaymentStatus.CAPTURED,
        { gatewayTransactionId: intentResult.paymentIntentId }
      );
      payment.status = PaymentStatus.CAPTURED;
      await this.paymentRepo.save(payment);

      // Auto-escrow
      payment.status = PaymentStatus.ESCROWED;
      payment.escrowedAt = new Date();
      const finalPayment = await this.paymentRepo.save(payment);

      await this.logTransaction(
        paymentId,
        TransactionAction.ESCROW,
        PaymentStatus.CAPTURED,
        PaymentStatus.ESCROWED,
        { amount: payment.amount, currency: payment.currency }
      );

      return { success: true, payment: this.mapToInterface(finalPayment) };
    } catch (error) {
      this.logger.error(`Confirm payment ${paymentId} failed: ${(error as Error).message}`);
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment).catch(() => {});
      await this.logTransaction(
        paymentId,
        TransactionAction.FAIL,
        PaymentStatus.AUTHORIZED,
        PaymentStatus.FAILED,
        { error: (error as Error).message }
      ).catch(() => {});
      return {
        success: false,
        payment: this.mapToInterface(payment),
        error: (error as Error).message,
      };
    }
  }

  async escrowFunds(paymentId: string): Promise<Payment> {
    const payment = await this.findPaymentOrFail(paymentId);

    if (!isValidPaymentTransition(payment.status as Payment['status'], 'escrowed')) {
      throw new BadRequestException(
        `Cannot escrow payment in status '${payment.status}'. Expected 'captured'.`
      );
    }

    const previous = payment.status;
    payment.status = PaymentStatus.ESCROWED;
    payment.escrowedAt = new Date();
    const saved = await this.paymentRepo.save(payment);

    await this.logTransaction(
      paymentId,
      TransactionAction.ESCROW,
      previous,
      PaymentStatus.ESCROWED,
      {
        amount: payment.amount,
        currency: payment.currency,
      }
    );

    return this.mapToInterface(saved);
  }

  async releaseFunds(paymentId: string): Promise<Payment> {
    const payment = await this.findPaymentOrFail(paymentId);

    if (!isValidPaymentTransition(payment.status as Payment['status'], 'released')) {
      throw new BadRequestException(
        `Cannot release payment in status '${payment.status}'. Expected 'escrowed'.`
      );
    }

    const previous = payment.status;
    payment.status = PaymentStatus.RELEASED;
    payment.releasedAt = new Date();
    const saved = await this.paymentRepo.save(payment);

    await this.logTransaction(
      paymentId,
      TransactionAction.RELEASE,
      previous,
      PaymentStatus.RELEASED,
      {
        amount: payment.amount,
        currency: payment.currency,
      }
    );

    return this.mapToInterface(saved);
  }

  async refundPayment(request: RefundRequest): Promise<Payment> {
    const payment = await this.findPaymentOrFail(request.paymentId);

    if (!isValidPaymentTransition(payment.status as Payment['status'], 'refunded')) {
      throw new BadRequestException(
        `Cannot refund payment in status '${payment.status}'. Expected 'escrowed'.`
      );
    }

    // Call Stripe to issue the refund
    let stripeRefundId: string | undefined;
    try {
      const refundResult = await this.stripeGateway.createRefund(
        payment.gatewayTransactionId,
        request.amount.amount
      );
      stripeRefundId = refundResult.refundId;
      this.logger.log(`Stripe refund ${stripeRefundId} created for payment ${payment.id}`);
    } catch (error) {
      this.logger.error(
        `Stripe refund failed for payment ${payment.id}: ${(error as Error).message}`
      );
      throw error;
    }

    const previous = payment.status;
    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    const saved = await this.paymentRepo.save(payment);

    await this.logTransaction(
      request.paymentId,
      TransactionAction.REFUND,
      previous,
      PaymentStatus.REFUNDED,
      {
        amount: request.amount.amount,
        currency: request.amount.currency,
        reason: request.reason,
        stripeRefundId,
      }
    );

    return this.mapToInterface(saved);
  }

  calculateRefundAmount(
    originalAmount: number,
    cancellationPolicy: 'flexible' | 'moderate' | 'strict',
    daysBefore: number
  ): { refundAmount: number; refundPercentage: number } {
    return calculateRefundAmount(originalAmount, cancellationPolicy, daysBefore);
  }

  async getPayment(id: string): Promise<Payment> {
    const payment = await this.findPaymentOrFail(id);
    return this.mapToInterface(payment);
  }

  async getTransactionLog(paymentId: string): Promise<TransactionLog[]> {
    const logs = await this.transactionLogRepo.find({
      where: { paymentId },
      order: { timestamp: 'ASC' },
    });
    return logs.map(this.mapLogToInterface);
  }

  async generateReceipt(paymentId: string): Promise<string> {
    this.logger.log(`Generating receipt for payment ${paymentId}`);
    const payment = await this.findPaymentOrFail(paymentId);

    const pdfBuffer = this.receiptService.generateReceiptPdf(this.mapToInterface(payment));
    const receiptUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    payment.receiptUrl = receiptUrl;
    await this.paymentRepo.save(payment);

    return receiptUrl;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async findPaymentOrFail(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  private async logTransaction(
    paymentId: string,
    action: TransactionAction,
    previousStatus: string,
    newStatus: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const log = this.transactionLogRepo.create({
      paymentId,
      action,
      previousStatus,
      newStatus,
      metadata,
      timestamp: new Date(),
    });
    await this.transactionLogRepo.save(log);
  }

  mapToInterface(entity: PaymentEntity): Payment {
    return {
      id: entity.id,
      bookingId: entity.bookingId,
      travelerId: entity.travelerId,
      guideId: entity.guideId,
      amount: { amount: Number(entity.amount), currency: entity.currency },
      status: entity.status as Payment['status'],
      paymentMethod: entity.paymentMethod as Payment['paymentMethod'],
      gatewayTransactionId: entity.gatewayTransactionId,
      receiptUrl: entity.receiptUrl ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      escrowedAt: entity.escrowedAt ?? undefined,
      releasedAt: entity.releasedAt ?? undefined,
      refundedAt: entity.refundedAt ?? undefined,
    };
  }

  private mapLogToInterface(log: TransactionLogEntity): TransactionLog {
    return {
      id: log.id,
      paymentId: log.paymentId,
      action: log.action as TransactionLog['action'],
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      amount:
        log.amount != null ? { amount: Number(log.amount), currency: log.currency } : undefined,
      metadata: log.metadata ?? {},
      timestamp: log.timestamp,
    };
  }
}

/**
 * Calculate refund amount based on cancellation policy and days before the experience.
 *
 * - flexible:  full refund if >= 1 day before, 50% otherwise
 * - moderate:  full refund if >= 7 days before, 50% otherwise
 * - strict:    full refund if >= 14 days before, 50% otherwise
 */
export function calculateRefundAmount(
  originalAmount: number,
  cancellationPolicy: 'flexible' | 'moderate' | 'strict',
  daysBefore: number
): { refundAmount: number; refundPercentage: number } {
  const thresholds: Record<'flexible' | 'moderate' | 'strict', number> = {
    flexible: 1,
    moderate: 7,
    strict: 14,
  };

  const refundPercentage = daysBefore >= thresholds[cancellationPolicy] ? 100 : 50;
  const refundAmount = (originalAmount * refundPercentage) / 100;

  return { refundAmount, refundPercentage };
}
