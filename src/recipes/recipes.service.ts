import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './recipe.entity';
import { RecipeModel } from './recipes.interface';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
  ) {}

  countByUser(userId: number): Promise<number> {
    return this.recipeRepository.count({ where: { userId } });
  }

  findAll(userId?: number): Promise<Recipe[]> {
    if (!userId) return this.recipeRepository.find();
    return this.recipeRepository.find({ where: { userId } });
  }

  async findOne(id: number): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOneBy({ id });
    if (!recipe) throw new NotFoundException('Recipe not found.');
    return recipe;
  }

  async create(recipe: RecipeModel, userId?: number): Promise<Recipe> {
    if (recipe.url) {
      const existing = await this.recipeRepository.findOneBy({ url: recipe.url });
      if (existing) {
        throw new ConflictException({
          message: 'A recipe from this URL is already saved.',
          existingId: existing.id,
          existingTitle: existing.title,
        });
      }
    }
    return this.recipeRepository.save({ ...recipe, userId: userId ?? null });
  }

  async delete(id: number, userId?: number): Promise<void> {
    const recipe = await this.recipeRepository.findOneBy({ id });
    if (!recipe) throw new NotFoundException('Recipe not found.');
    if (userId !== undefined && recipe.userId !== userId) throw new NotFoundException('Recipe not found.');
    await this.recipeRepository.delete(id);
  }

  async findByShareToken(token: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOneBy({ shareToken: token });
    if (!recipe) throw new NotFoundException('Recipe not found.');
    return recipe;
  }

  async generateShareToken(id: number): Promise<Recipe> {
    const recipe = await this.findOne(id);
    if (recipe.shareToken) return recipe;
    const token = randomBytes(16).toString('hex');
    await this.recipeRepository.update(id, { shareToken: token });
    return this.findOne(id);
  }

  async saveShared(token: string, userId: number): Promise<Recipe> {
    const { id, shareToken, createdAt, updatedAt, userId: _uid, ...rest } = await this.findByShareToken(token);
    return this.recipeRepository.save({ ...rest, userId, shareToken: null });
  }

  async createFromLibrary(publicRecipe: { id: number; title: string; category?: string | null; url?: string | null; ingredients?: object | null; data?: object | null }, userId: number): Promise<Recipe> {
    return this.recipeRepository.save({
      title: publicRecipe.title,
      category: publicRecipe.category ?? null,
      url: publicRecipe.url ?? null,
      ingredients: (publicRecipe.ingredients ?? null) as Recipe['ingredients'],
      data: publicRecipe.data ?? null,
      userId,
      shareToken: null,
      sourcePublicRecipeId: publicRecipe.id,
    });
  }

  findByPublicRecipeId(publicRecipeId: number, userId: number): Promise<Recipe | null> {
    return this.recipeRepository.findOneBy({ sourcePublicRecipeId: publicRecipeId, userId });
  }

  async update(id: number, recipe: RecipeModel): Promise<Recipe> {
    this.logger.log(`Updating recipe with id: ${id}`);
    await this.findOne(id);
    await this.recipeRepository.update(id, recipe);
    return this.findOne(id);
  }
}
