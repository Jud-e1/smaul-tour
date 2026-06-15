import { Entity, Column, UpdateDateColumn, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

export enum GuideVerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName!: string | null;

  @Column({ type: 'text', nullable: true, name: 'profile_photo_url' })
  profilePhotoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 3, default: 'USD', name: 'preferred_currency' })
  preferredCurrency!: string;

  @Column({ type: 'varchar', length: 5, default: 'en', name: 'preferred_language' })
  preferredLanguage!: string;

  @Column({ type: 'jsonb', nullable: true, name: 'travel_preferences' })
  travelPreferences!: string[] | null;

  @Column({
    type: 'enum',
    enum: GuideVerificationStatus,
    nullable: true,
    name: 'guide_verification_status',
  })
  guideVerificationStatus!: GuideVerificationStatus;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
