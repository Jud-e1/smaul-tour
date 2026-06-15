import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Experience } from './experience.entity';
import { Booking } from './booking.entity';
import { Review } from './review.entity';
import { Notification } from './notification.entity';

export enum UserRole {
  TRAVELER = 'traveler',
  GUIDE = 'guide',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_hash' })
  passwordHash!: string | null;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @Column({ type: 'boolean', default: false })
  locked!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'lockout_until' })
  lockoutUntil!: Date | null;

  @Column({ type: 'integer', default: 0, name: 'failed_login_attempts' })
  failedLoginAttempts!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile!: UserProfile;

  @OneToMany(() => Experience, (experience) => experience.guide)
  experiences!: Experience[];

  @OneToMany(() => Booking, (booking) => booking.traveler)
  bookingsAsTraveler!: Booking[];

  @OneToMany(() => Booking, (booking) => booking.guide)
  bookingsAsGuide!: Booking[];

  @OneToMany(() => Review, (review) => review.traveler)
  reviews!: Review[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];
}
