import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface StripePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  /** Present when 3D Secure or other redirect is required */
  nextActionUrl?: string;
}

export interface StripeRefundResult {
  refundId: string;
  status: string;
  amount: number;
}

@Injectable()
export class StripeGatewayService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeGatewayService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') ??
      this.configService.get<string>('PAYMENT_API_KEY') ??
      '';

    this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
  }

  /**
   * Create a PaymentIntent and optionally confirm it immediately.
   * Supports card, mobile_money, and link (digital wallet) payment methods.
   * Returns clientSecret and nextActionUrl when 3D Secure redirect is required.
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    paymentMethodId: string,
    returnUrl: string
  ): Promise<StripePaymentIntentResult> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to smallest currency unit
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        payment_method_types: ['card', 'link'],
        confirm: true,
        return_url: returnUrl,
      });

      return this.mapIntentResult(intent);
    } catch (error) {
      this.logger.error('Failed to create PaymentIntent', error);
      throw new InternalServerErrorException(
        `Stripe error: ${(error as Stripe.errors.StripeError).message ?? 'unknown'}`
      );
    }
  }

  /**
   * Confirm an existing PaymentIntent (e.g. after 3DS redirect).
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntentResult> {
    try {
      const intent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      return this.mapIntentResult(intent);
    } catch (error) {
      this.logger.error(`Failed to confirm PaymentIntent ${paymentIntentId}`, error);
      throw new InternalServerErrorException(
        `Stripe error: ${(error as Stripe.errors.StripeError).message ?? 'unknown'}`
      );
    }
  }

  /**
   * Issue a full or partial refund for a PaymentIntent.
   * @param amount Optional partial refund amount in major currency units (e.g. 10.00 USD).
   *               Omit for a full refund.
   */
  async createRefund(paymentIntentId: string, amount?: number): Promise<StripeRefundResult> {
    try {
      const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
      if (amount !== undefined) {
        params.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(params);

      return {
        refundId: refund.id,
        status: refund.status ?? 'unknown',
        amount: refund.amount / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to create refund for PaymentIntent ${paymentIntentId}`, error);
      throw new InternalServerErrorException(
        `Stripe refund error: ${(error as Stripe.errors.StripeError).message ?? 'unknown'}`
      );
    }
  }

  /**
   * Verify a Stripe webhook signature and return the parsed event.
   * Throws if the signature is invalid.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private mapIntentResult(intent: Stripe.PaymentIntent): StripePaymentIntentResult {
    const result: StripePaymentIntentResult = {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret ?? '',
      status: intent.status,
    };

    // 3D Secure or other redirect required
    if (intent.status === 'requires_action' && intent.next_action?.type === 'redirect_to_url') {
      result.nextActionUrl = intent.next_action.redirect_to_url?.url ?? undefined;
    }

    return result;
  }
}
