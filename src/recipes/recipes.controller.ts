import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipeModel } from './recipes.interface';
import { Recipe } from './recipe.entity';
import { UsersService } from '../users/users.service';
import { CrawlerService } from '../crawler/crawler.service';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly usersService: UsersService,
    private readonly crawlerService: CrawlerService,
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

  @Post(':id/translate')
  @HttpCode(200)
  public async translate(
    @Headers('x-user-email') email: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Recipe> {
    const user = email ? await this.usersService.findByEmail(email) : null;
    if (!user || (user.tier !== 'expert' && user.tier !== 'admin')) {
      throw new ForbiddenException({ message: 'Translation requires an Expert subscription.', code: 'EXPERT_REQUIRED' });
    }

    const recipe = await this.recipesService.findOne(id);
    const payload = {
      title: recipe.title,
      ...(recipe.data as Record<string, any>),
      ingredients: recipe.ingredients,
    };

    const translated = await this.crawlerService.translate(payload);

    return this.recipesService.update(id, {
      ...recipe,
      title: translated.title ?? recipe.title,
      ingredients: translated.ingredients ?? recipe.ingredients,
      data: { ...(recipe.data as Record<string, any>), ...translated },
    });
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
