import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Payment as PaymentEntity, PaymentStatus } from '../database/entities/payment.entity';
import { PaymentsService } from './payments.service';

@Injectable()
export class EscrowReleaseScheduler {
  private readonly logger = new Logger(EscrowReleaseScheduler.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    private readonly paymentsService: PaymentsService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async releaseEligibleEscrows(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const eligiblePayments = await this.paymentRepo.find({
      where: {
        status: PaymentStatus.ESCROWED,
        escrowedAt: LessThan(cutoff),
      },
    });

    if (eligiblePayments.length === 0) {
      return;
    }

    this.logger.log(`Auto-releasing ${eligiblePayments.length} escrowed payment(s)`);

    for (const payment of eligiblePayments) {
      try {
        await this.paymentsService.releaseFunds(payment.id);
        this.logger.log(
          `Auto-released payment ${payment.id} (escrowed at ${payment.escrowedAt?.toISOString()})`
        );
      } catch (error) {
        this.logger.error(
          `Failed to auto-release payment ${payment.id}: ${(error as Error).message}`
        );
      }
    }
  }
}
