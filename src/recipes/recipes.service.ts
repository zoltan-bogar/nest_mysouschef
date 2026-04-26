import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { RecipeModel } from './recipes.interface';

@Injectable()
export class RecipesService {
  private recipes: Array<RecipeModel> = [];
  private readonly logger = new Logger(RecipesService.name);

  public findAll(): Array<RecipeModel> {
    return this.recipes;
  }

  public findOne(id: number): RecipeModel {
    const recipe: RecipeModel = this.recipes.find((recipe) => recipe.id === id);

    if (!recipe) {
      throw new NotFoundException('Recipe not found.');
    }

    return recipe;
  }

  public create(recipe: RecipeModel): RecipeModel {
    // if the title is already in use by another recipe
    const titleExists: boolean = this.recipes.some(
      (item) => item.title === recipe.title,
    );
    if (titleExists) {
      throw new UnprocessableEntityException('Recipe title already exists.');
    }

    // find the next id for a new blog recipe
    const maxId: number = Math.max(
      ...this.recipes.map((recipe) => recipe.id),
      0,
    );
    const id: number = maxId + 1;

    const recipeItem: RecipeModel = {
      ...recipe,
      id,
    };

    this.recipes.push(recipeItem);

    return recipeItem;
  }

  public delete(id: number): void {
    const index: number = this.recipes.findIndex((recipe) => recipe.id === id);

    // -1 is returned when no findIndex() match is found
    if (index === -1) {
      throw new NotFoundException('Recipe not found.');
    }

    this.recipes.splice(index, 1);
  }

  public update(id: number, recipe: RecipeModel): RecipeModel {
    this.logger.log(`Updating recipe with id: ${id}`);

    const index: number = this.recipes.findIndex((recipe) => recipe.id === id);

    // -1 is returned when no findIndex() match is found
    if (index === -1) {
      throw new NotFoundException('Recipe not found.');
    }

    // if the title is already in use by another recipe
    const titleExists: boolean = this.recipes.some(
      (item) => item.title === recipe.title && item.id !== id,
    );
    if (titleExists) {
      throw new UnprocessableEntityException('Recipe title already exists.');
    }

    const recipeItem: RecipeModel = {
      ...recipe,
      id,
    };

    this.recipes[index] = recipeItem;

    return recipeItem;
  }
}
