import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Itinerary } from './itinerary.entity';
import { Experience } from './experience.entity';

@Entity('itinerary_experiences')
export class ItineraryExperience {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'itinerary_id' })
  itineraryId!: string;

  @Column({ type: 'uuid', name: 'experience_id' })
  experienceId!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'relevance_score' })
  relevanceScore!: number;

  @Column({ type: 'date', nullable: true, name: 'suggested_date' })
  suggestedDate!: Date;

  @Column({ type: 'text', nullable: true })
  reasoning!: string;

  @Column({ type: 'integer' })
  position!: number;

  @ManyToOne(() => Itinerary, (itinerary) => itinerary.experiences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itinerary_id' })
  itinerary!: Itinerary;

  @ManyToOne(() => Experience)
  @JoinColumn({ name: 'experience_id' })
  experience!: Experience;
}
