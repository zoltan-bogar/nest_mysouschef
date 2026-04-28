import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cookbook } from './cookbook.entity';
import { Recipe } from '../recipes/recipe.entity';

@Injectable()
export class CookbooksService {
  constructor(
    @InjectRepository(Cookbook) private readonly cookbookRepo: Repository<Cookbook>,
    @InjectRepository(Recipe) private readonly recipeRepo: Repository<Recipe>,
  ) {}

  findAllByUser(userId: number): Promise<Cookbook[]> {
    return this.cookbookRepo.find({
      where: { userId },
      relations: ['recipes'],
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async ensureDefaultCookbook(userId: number, name = 'Kezdő'): Promise<Cookbook> {
    const existing = await this.cookbookRepo.findOne({ where: { userId, isDefault: true } });
    if (existing) return existing;
    return this.cookbookRepo.save({ name, userId, isDefault: true, recipes: [] });
  }

  async create(name: string, userId: number): Promise<Cookbook> {
    return this.cookbookRepo.save({ name, userId, isDefault: false, recipes: [] });
  }

  async addRecipe(cookbookId: number, recipeId: number): Promise<void> {
    const [cookbook, recipe] = await Promise.all([
      this.cookbookRepo.findOne({ where: { id: cookbookId }, relations: ['recipes'] }),
      this.recipeRepo.findOneBy({ id: recipeId }),
    ]);
    if (!cookbook || !recipe) return;
    if (!cookbook.recipes.some(r => r.id === recipeId)) {
      cookbook.recipes.push(recipe);
      await this.cookbookRepo.save(cookbook);
    }
  }

  async removeRecipe(cookbookId: number, recipeId: number): Promise<void> {
    const cookbook = await this.cookbookRepo.findOne({ where: { id: cookbookId }, relations: ['recipes'] });
    if (!cookbook) return;
    cookbook.recipes = cookbook.recipes.filter(r => r.id !== recipeId);
    await this.cookbookRepo.save(cookbook);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.cookbookRepo.delete({ id, userId });
  }

  async getDefaultCookbookId(userId: number): Promise<number | null> {
    const cookbook = await this.cookbookRepo.findOne({ where: { userId, isDefault: true } });
    return cookbook?.id ?? null;
  }
}
