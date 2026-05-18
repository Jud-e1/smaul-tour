import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Experience } from './experience.entity';

@Entity('images')
export class Image {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'experience_id' })
  experienceId!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text', name: 'thumbnail_url' })
  thumbnailUrl!: string;

  @Column({ type: 'text', name: 'medium_url' })
  mediumUrl!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'original_filename' })
  originalFilename!: string;

  @Column({ type: 'integer', name: 'size_bytes' })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;

  @ManyToOne(() => Experience, experience => experience.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'experience_id' })
  experience!: Experience;
}
