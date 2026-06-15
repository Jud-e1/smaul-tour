import { Controller, Post, Req, Headers, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment as PaymentEntity, PaymentStatus } from '../database/entities/payment.entity';
import { StripeGatewayService } from './stripe-gateway.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripeGateway: StripeGatewayService,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    private readonly configService: ConfigService
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string
  ): Promise<{ received: boolean }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    const rawBody: Buffer = (req as any).rawBody ?? req.body;

    let event: Stripe.Event;
    try {
      event = this.stripeGateway.verifyWebhookSignature(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing Stripe webhook event: ${event.type} (${event.id})`);

    await this.handleEvent(event);

    return { received: true };
  }

  private async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.updatePaymentStatus(intent.id, PaymentStatus.CAPTURED);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.updatePaymentStatus(intent.id, PaymentStatus.FAILED);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (paymentIntentId) {
          await this.updatePaymentStatus(paymentIntentId, PaymentStatus.REFUNDED);
        }
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async updatePaymentStatus(
    gatewayTransactionId: string,
    newStatus: PaymentStatus
  ): Promise<void> {
    const payment = await this.paymentRepo.findOne({ where: { gatewayTransactionId } });
    if (!payment) {
      this.logger.warn(`No payment found for gatewayTransactionId: ${gatewayTransactionId}`);
      return;
    }

    this.logger.log(
      `Updating payment ${payment.id} status: ${payment.status} → ${newStatus} (event: ${gatewayTransactionId})`
    );

    payment.status = newStatus;
    if (newStatus === PaymentStatus.REFUNDED) {
      payment.refundedAt = new Date();
    }
    await this.paymentRepo.save(payment);
  }
}
