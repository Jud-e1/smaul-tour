import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { VerificationRequest } from './verification-request.entity';

@Entity('verification_documents')
export class VerificationDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'verification_request_id' })
  verificationRequestId!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'text' })
  url!: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;

  @ManyToOne(() => VerificationRequest, request => request.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'verification_request_id' })
  verificationRequest!: VerificationRequest;
}
