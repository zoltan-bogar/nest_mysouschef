import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Recipe } from '../recipes/recipe.entity';

@Entity('cookbooks')
export class Cookbook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  userId: number | null;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToMany(() => Recipe, { eager: false })
  @JoinTable({
    name: 'cookbook_recipes',
    joinColumn: { name: 'cookbook_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'recipe_id', referencedColumnName: 'id' },
  })
  recipes: Recipe[];

  @CreateDateColumn()
  createdAt: Date;
}
