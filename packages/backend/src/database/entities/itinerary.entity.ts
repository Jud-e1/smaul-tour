import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ItineraryExperience } from './itinerary-experience.entity';

@Entity('itineraries')
export class Itinerary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'jsonb' })
  parameters!: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_cost_amount' })
  totalCostAmount!: number;

  @Column({ type: 'varchar', length: 3, nullable: true, name: 'total_cost_currency' })
  totalCostCurrency!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => ItineraryExperience, (itineraryExperience) => itineraryExperience.itinerary)
  experiences!: ItineraryExperience[];
}
