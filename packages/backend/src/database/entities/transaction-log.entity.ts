import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Payment } from './payment.entity';

export enum TransactionAction {
  AUTHORIZE = 'authorize',
  CAPTURE = 'capture',
  ESCROW = 'escrow',
  RELEASE = 'release',
  REFUND = 'refund',
  FAIL = 'fail',
}

@Entity('transaction_logs')
export class TransactionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId!: string;

  @Column({ type: 'enum', enum: TransactionAction })
  action!: TransactionAction;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'previous_status' })
  previousStatus!: string;

  @Column({ type: 'varchar', length: 20, name: 'new_status' })
  newStatus!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount!: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;

  @ManyToOne(() => Payment, (payment) => payment.transactionLogs)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;
}
