import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Image } from './image.entity';
import { AvailabilitySlot } from './availability-slot.entity';
import { Review } from './review.entity';
import { CancellationPolicy } from './cancellation-policy.enum';

export { CancellationPolicy } from './cancellation-policy.enum';

export enum ExperienceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
}

@Entity('experiences')
export class Experience {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'guide_id' })
  guideId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', name: 'location_address' })
  locationAddress!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'location_lat' })
  locationLat!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'location_lng' })
  locationLng!: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, name: 'duration_hours' })
  durationHours!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_amount' })
  priceAmount!: number;

  @Column({ type: 'varchar', length: 3, name: 'price_currency' })
  priceCurrency!: string;

  @Column({ type: 'varchar', array: true })
  category!: string[];

  @Column({ type: 'uuid', nullable: true, name: 'primary_image_id' })
  primaryImageId!: string;

  @Column({ 
    type: 'enum', 
    enum: ExperienceStatus, 
    default: ExperienceStatus.PENDING_APPROVAL 
  })
  status!: ExperienceStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'average_rating' })
  averageRating!: number;

  @Column({ type: 'integer', default: 0, name: 'review_count' })
  reviewCount!: number;

  @Column({ 
    type: 'enum', 
    enum: CancellationPolicy, 
    enumName: 'cancellation_policy_enum',
    default: CancellationPolicy.MODERATE,
    name: 'cancellation_policy'
  })
  cancellationPolicy!: CancellationPolicy;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.experiences)
  @JoinColumn({ name: 'guide_id' })
  guide!: User;

  @OneToMany(() => Image, image => image.experience)
  images!: Image[];

  @OneToMany(() => AvailabilitySlot, slot => slot.experience)
  availabilitySlots!: AvailabilitySlot[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @OneToMany('Booking', (booking: any) => booking.experience)
  bookings!: any[];

  @OneToMany(() => Review, review => review.experience)
  reviews!: Review[];
}
