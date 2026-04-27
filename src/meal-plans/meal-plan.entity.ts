import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('meal_plans')
export class MealPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  weekStart: string; // ISO date string of the Monday, e.g. "2024-01-08"

  @Column({ type: 'jsonb' })
  plan: Record<string, Record<string, number | null>>;

  @UpdateDateColumn()
  updatedAt: Date;
}
