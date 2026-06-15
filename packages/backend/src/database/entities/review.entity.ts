import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Experience } from './experience.entity';
import { Booking } from './booking.entity';

export enum ReviewStatus {
  PUBLISHED = 'published',
  FLAGGED = 'flagged',
  REMOVED = 'removed',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true, name: 'booking_id' })
  bookingId!: string;

  @Column({ type: 'uuid', name: 'experience_id' })
  experienceId!: string;

  @Column({ type: 'uuid', name: 'traveler_id' })
  travelerId!: string;

  @Column({ type: 'uuid', name: 'guide_id' })
  guideId!: string;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PUBLISHED })
  status!: ReviewStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Booking, (booking) => booking.reviews)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => Experience, (experience) => experience.reviews)
  @JoinColumn({ name: 'experience_id' })
  experience!: Experience;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'traveler_id' })
  traveler!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'guide_id' })
  guide!: User;
}
