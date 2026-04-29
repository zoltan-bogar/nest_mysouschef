import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
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
import { CookbooksService } from '../cookbooks/cookbooks.service';
import { PublicRecipesService } from '../public-recipes/public-recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly usersService: UsersService,
    private readonly crawlerService: CrawlerService,
    private readonly cookbooksService: CookbooksService,
    private readonly publicRecipesService: PublicRecipesService,
  ) {}

  private async resolveUserId(email?: string): Promise<number | undefined> {
    if (!email) return undefined;
    const user = await this.usersService.findByEmail(email);
    return user?.id;
  }

  @Post()
  public async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: RecipeModel & { cookbookId?: number },
  ): Promise<Recipe> {
    const { cookbookId, ...recipe } = body;
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
    const saved = await this.recipesService.create(recipe, userId);
    if (userId) {
      const targetId = cookbookId ?? await this.cookbooksService.getDefaultCookbookId(userId);
      if (targetId) await this.cookbooksService.addRecipe(targetId, saved.id);
    }
    return saved;
  }

  @Get()
  public async findAll(
    @Headers('x-user-email') email: string | undefined,
  ): Promise<Recipe[]> {
    const userId = await this.resolveUserId(email);
    return this.recipesService.findAll(userId);
  }

  @Get('shared/:token')
  public getShared(@Param('token') token: string): Promise<Recipe> {
    return this.recipesService.findByShareToken(token);
  }

  @Post('shared/:token/save')
  @HttpCode(200)
  public async saveShared(
    @Headers('x-user-email') email: string | undefined,
    @Param('token') token: string,
  ): Promise<Recipe> {
    const userId = await this.resolveUserId(email);
    if (!userId) throw new ForbiddenException('Must be signed in to save.');
    return this.recipesService.saveShared(token, userId);
  }

  @Get('from-library/:publicId/check')
  public async checkFromLibrary(
    @Headers('x-user-email') email: string | undefined,
    @Param('publicId', ParseIntPipe) publicId: number,
  ): Promise<{ saved: boolean; recipeId?: number }> {
    const userId = await this.resolveUserId(email);
    if (!userId) return { saved: false };
    const existing = await this.recipesService.findByPublicRecipeId(publicId, userId);
    return existing ? { saved: true, recipeId: existing.id } : { saved: false };
  }

  @Post('from-library/:publicId')
  @HttpCode(200)
  public async addFromLibrary(
    @Headers('x-user-email') email: string | undefined,
    @Param('publicId', ParseIntPipe) publicId: number,
  ): Promise<Recipe> {
    const userId = await this.resolveUserId(email);
    if (!userId) throw new ForbiddenException('Must be signed in to save.');
    const publicRecipe = await this.publicRecipesService.findById(publicId);
    if (!publicRecipe) throw new NotFoundException('Public recipe not found.');
    const user = await this.usersService.findByEmail(email!);
    if (user?.tier === 'free') {
      const count = await this.recipesService.countByUser(userId);
      if (count >= 5) throw new ForbiddenException({ message: 'Recipe limit reached.', code: 'RECIPE_LIMIT_REACHED' });
    }
    const saved = await this.recipesService.createFromLibrary(publicRecipe, userId);
    const cookbookId = await this.cookbooksService.getDefaultCookbookId(userId);
    if (cookbookId) await this.cookbooksService.addRecipe(cookbookId, saved.id);
    return saved;
  }

  @Get(':id')
  public findOne(@Param('id', ParseIntPipe) id: number): Promise<Recipe> {
    return this.recipesService.findOne(id);
  }

  @Post(':id/share')
  @HttpCode(200)
  public async share(@Param('id', ParseIntPipe) id: number): Promise<{ token: string }> {
    const recipe = await this.recipesService.generateShareToken(id);
    return { token: recipe.shareToken! };
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
  @HttpCode(200)
  public async delete(
    @Headers('x-user-email') email: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const userId = await this.resolveUserId(email);
    return this.recipesService.delete(id, userId);
  }

  @Put(':id')
  public update(
    @Param('id', ParseIntPipe) id: number,
    @Body() post: RecipeModel,
  ): Promise<Recipe> {
    return this.recipesService.update(id, post);
  }
}
