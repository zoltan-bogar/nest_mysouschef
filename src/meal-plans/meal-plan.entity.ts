import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('meal_plans')
@Unique(['weekStart', 'userId'])
export class MealPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  weekStart: string; // ISO date string of the Monday, e.g. "2024-01-08"

  @Column({ type: 'jsonb' })
  plan: Record<string, Record<string, number | null>>;

  @Column({ nullable: true })
  userId: number | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
