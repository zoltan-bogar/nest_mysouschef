import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
