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

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  public create(@Body() recipe: RecipeModel): RecipeModel {
    return <RecipeModel>this.recipesService.create(recipe);
  }

  @Get()
  public findAll(): Array<RecipeModel> {
    return this.recipesService.findAll();
  }

  @Get(':id')
  public findOne(@Param('id', ParseIntPipe) id: number): RecipeModel {
    return this.recipesService.findOne(id);
  }

  @Delete(':id')
  public delete(@Param('id', ParseIntPipe) id: number): void {
    this.recipesService.delete(id);
  }

  @Put(':id')
  public update(
    @Param('id', ParseIntPipe) id: number,
    @Body() post: RecipeModel,
  ): RecipeModel {
    return this.recipesService.update(id, post);
  }
}
