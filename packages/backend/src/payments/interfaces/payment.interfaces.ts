export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  travelerId: string;
  guideId: string;
  amount: MoneyAmount;
  status: 'pending' | 'authorized' | 'captured' | 'escrowed' | 'released' | 'refunded' | 'failed';
  paymentMethod: 'card' | 'mobile_money' | 'digital_wallet';
  gatewayTransactionId: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  escrowedAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
}

export interface PaymentRequest {
  bookingId: string;
  travelerId: string;
  guideId: string;
  amount: MoneyAmount;
  paymentMethodId: string;
  returnUrl: string;
}

export interface PaymentResult {
  success: boolean;
  payment: Payment;
  redirectUrl?: string;
  error?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: MoneyAmount;
  reason: string;
}

export interface TransactionLog {
  id: string;
  paymentId: string;
  action: 'authorize' | 'capture' | 'escrow' | 'release' | 'refund' | 'fail';
  previousStatus: string;
  newStatus: string;
  amount?: MoneyAmount;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface IPaymentService {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  confirmPayment(paymentId: string): Promise<PaymentResult>;
  escrowFunds(paymentId: string): Promise<Payment>;
  releaseFunds(paymentId: string): Promise<Payment>;
  refundPayment(request: RefundRequest): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
  getTransactionLog(paymentId: string): Promise<TransactionLog[]>;
  generateReceipt(paymentId: string): Promise<string>;
}

/**
 * Payment state machine valid transitions:
 *
 * pending → authorized → captured → escrowed → released
 *                                          ↓
 *                                      refunded
 *
 * Any state → failed (on gateway error)
 */
export const PAYMENT_STATE_TRANSITIONS: Record<Payment['status'], Payment['status'][]> = {
  pending: ['authorized', 'failed'],
  authorized: ['captured', 'failed'],
  captured: ['escrowed', 'failed'],
  escrowed: ['released', 'refunded'],
  released: [],
  refunded: [],
  failed: [],
};

/**
 * Returns true if the transition from `from` to `to` is valid.
 */
export function isValidPaymentTransition(from: Payment['status'], to: Payment['status']): boolean {
  return PAYMENT_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
