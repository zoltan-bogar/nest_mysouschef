import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
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

  async delete(id: number): Promise<void> {
    const result = await this.recipeRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Recipe not found.');
  }

  async update(id: number, recipe: RecipeModel): Promise<Recipe> {
    this.logger.log(`Updating recipe with id: ${id}`);
    await this.findOne(id);
    await this.recipeRepository.update(id, recipe);
    return this.findOne(id);
  }
}
