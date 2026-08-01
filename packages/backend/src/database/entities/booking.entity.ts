import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Experience } from './experience.entity';
import { Payment } from './payment.entity';
import { Review } from './review.entity';
import { CancellationPolicy } from './experience.enums';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 8, unique: true, name: 'reference_number' })
  referenceNumber: string;

  @Column({ type: 'uuid', name: 'traveler_id' })
  travelerId: string;

  @Column({ type: 'uuid', name: 'experience_id' })
  experienceId: string;

  @Column({ type: 'uuid', name: 'guide_id' })
  guideId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({ type: 'integer', default: 1 })
  participants: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, name: 'total_currency' })
  totalCurrency: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: CancellationPolicy, name: 'cancellation_policy' })
  cancellationPolicy: CancellationPolicy;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string;

  @ManyToOne(() => User, user => user.bookingsAsTraveler)
  @JoinColumn({ name: 'traveler_id' })
  traveler: User;

  @ManyToOne(() => User, user => user.bookingsAsGuide)
  @JoinColumn({ name: 'guide_id' })
  guide: User;

  @ManyToOne(() => Experience, experience => experience.bookings)
  @JoinColumn({ name: 'experience_id' })
  experience: Experience;

  @OneToMany(() => Payment, payment => payment.booking)
  payments: Payment[];

  @OneToMany(() => Review, review => review.booking)
  reviews: Review[];
}
