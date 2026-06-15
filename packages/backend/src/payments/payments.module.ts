import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../database/entities/payment.entity';
import { TransactionLog } from '../database/entities/transaction-log.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeGatewayService } from './stripe-gateway.service';
import { EscrowReleaseScheduler } from './escrow-release.scheduler';
import { WebhookController } from './webhook.controller';
import { ReceiptService } from './receipt.service';
import { CurrencyService } from './currency.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, TransactionLog])],
  providers: [
    PaymentsService,
    StripeGatewayService,
    EscrowReleaseScheduler,
    ReceiptService,
    CurrencyService,
  ],
  controllers: [PaymentsController, WebhookController],
  exports: [PaymentsService, StripeGatewayService, CurrencyService],
})
export class PaymentsModule {}
