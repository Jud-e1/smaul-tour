import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { VerificationDocument } from './verification-document.entity';

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('verification_requests')
export class VerificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'guide_id' })
  guideId!: string;

  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING })
  status!: VerificationStatus;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy!: string;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt!: Date;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason!: string;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'guide_id' })
  guide!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: User;

  @OneToMany(() => VerificationDocument, document => document.verificationRequest)
  documents!: VerificationDocument[];
}
