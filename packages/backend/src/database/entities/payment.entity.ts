import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Booking } from './booking.entity';
import { TransactionLog } from './transaction-log.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  ESCROWED = 'escrowed',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  DIGITAL_WALLET = 'digital_wallet',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId!: string;

  @Column({ type: 'uuid', name: 'traveler_id' })
  travelerId!: string;

  @Column({ type: 'uuid', name: 'guide_id' })
  guideId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method' })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'gateway_transaction_id' })
  gatewayTransactionId!: string;

  @Column({ type: 'text', nullable: true, name: 'receipt_url' })
  receiptUrl!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'escrowed_at' })
  escrowedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'released_at' })
  releasedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'refunded_at' })
  refundedAt!: Date;

  @ManyToOne(() => Booking, booking => booking.payments)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'traveler_id' })
  traveler!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'guide_id' })
  guide!: User;

  @OneToMany(() => TransactionLog, log => log.payment)
  transactionLogs!: TransactionLog[];
}
