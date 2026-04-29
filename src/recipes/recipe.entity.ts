import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  ingredients: { name: string; amount: string; unit: string }[];

  @Column({ type: 'jsonb', nullable: true })
  data: object;

  @Column({ nullable: true })
  userId: number | null;

  @Index({ unique: true, sparse: true })
  @Column({ nullable: true })
  shareToken: string | null;

  @Column({ nullable: true })
  sourcePublicRecipeId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
