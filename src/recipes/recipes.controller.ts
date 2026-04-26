import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipeModel } from './recipes.interface';
import { Recipe } from './recipe.entity';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  public create(@Body() recipe: RecipeModel): Promise<Recipe> {
    return this.recipesService.create(recipe);
  }

  @Get()
  public findAll(): Promise<Recipe[]> {
    return this.recipesService.findAll();
  }

  @Get(':id')
  public findOne(@Param('id', ParseIntPipe) id: number): Promise<Recipe> {
    return this.recipesService.findOne(id);
  }

  @Delete(':id')
  public delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.recipesService.delete(id);
  }

  @Put(':id')
  public update(
    @Param('id', ParseIntPipe) id: number,
    @Body() post: RecipeModel,
  ): Promise<Recipe> {
    return this.recipesService.update(id, post);
  }
}
