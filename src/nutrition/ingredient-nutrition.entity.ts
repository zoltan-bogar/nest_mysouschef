import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('ingredient_nutrition')
@Index(['name_en', 'unit'], { unique: true })
export class IngredientNutrition {
  @PrimaryGeneratedColumn() id: number;
  @Column() name_en: string;
  @Column({ nullable: true }) name_hu: string | null;
  @Column() unit: string;
  @Column('float', { default: 100 }) grams_per_unit: number;
  @Column('float') calories: number;
  @Column('float') protein: number;
  @Column('float') fat: number;
  @Column('float') carbs: number;
  @Column('float', { default: 0 }) fiber: number;
  @Column('float', { default: 0 }) sugar: number;
  @Column('float', { default: 0 }) sodium: number;
  @Column('float', { default: 0 }) cholesterol: number;
  @CreateDateColumn() createdAt: Date;
}
