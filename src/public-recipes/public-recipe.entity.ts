import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('public_recipes')
export class PublicRecipe {
  @PrimaryGeneratedColumn() id: number;

  @Index({ unique: true, sparse: true })
  @Column({ nullable: true }) url: string | null;

  @Column() title: string;
  @Column({ nullable: true }) category: string | null;
  @Column({ type: 'jsonb', nullable: true }) ingredients: object | null;
  @Column({ type: 'jsonb', nullable: true }) data: object | null;
  @Column({ nullable: true }) submittedByUserId: number | null;

  @CreateDateColumn() createdAt: Date;
}
