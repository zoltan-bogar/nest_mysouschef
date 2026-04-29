import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('meal_plan_templates')
export class MealPlanTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  userId: number | null;

  // Keys are day indices "0"–"6" (Monday–Sunday)
  @Column({ type: 'jsonb' })
  plan: Record<string, Record<string, number[]>>;

  @CreateDateColumn()
  createdAt: Date;
}
