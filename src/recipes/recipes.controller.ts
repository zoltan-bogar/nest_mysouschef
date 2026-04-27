import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipeModel } from './recipes.interface';
import { Recipe } from './recipe.entity';
import { UsersService } from '../users/users.service';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveUserId(email?: string): Promise<number | undefined> {
    if (!email) return undefined;
    const user = await this.usersService.findByEmail(email);
    return user?.id;
  }

  @Post()
  public async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() recipe: RecipeModel,
  ): Promise<Recipe> {
    const userId = await this.resolveUserId(email);
    if (userId) {
      const user = await this.usersService.findByEmail(email!);
      if (user?.tier === 'free') {
        const count = await this.recipesService.countByUser(userId);
        if (count >= 5) {
          throw new ForbiddenException({ message: 'Recipe limit reached.', code: 'RECIPE_LIMIT_REACHED' });
        }
      }
    }
    return this.recipesService.create(recipe, userId);
  }

  @Get()
  public async findAll(
    @Headers('x-user-email') email: string | undefined,
  ): Promise<Recipe[]> {
    const userId = await this.resolveUserId(email);
    return this.recipesService.findAll(userId);
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
