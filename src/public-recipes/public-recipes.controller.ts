import { Body, Controller, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Headers } from '@nestjs/common';
import { PublicRecipesService } from './public-recipes.service';
import { UsersService } from '../users/users.service';
import { PublicRecipe } from './public-recipe.entity';

@Controller('public-recipes')
export class PublicRecipesController {
  constructor(
    private readonly service: PublicRecipesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ): Promise<{ recipes: PublicRecipe[]; total: number }> {
    return this.service.findAll({
      limit: Math.min(parseInt(limit ?? '30', 10) || 30, 100),
      offset: parseInt(offset ?? '0', 10) || 0,
      search: search?.trim() || undefined,
    });
  }

  @Get('check')
  async check(@Query('url') url: string): Promise<{ exists: boolean; id?: number }> {
    if (!url) return { exists: false };
    const recipe = await this.service.findByUrl(url);
    return recipe ? { exists: true, id: recipe.id } : { exists: false };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PublicRecipe> {
    const recipe = await this.service.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found.');
    return recipe;
  }

  @Post()
  @HttpCode(200)
  async add(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: {
      url?: string;
      title: string;
      category?: string;
      ingredients?: object;
      data?: object;
    },
  ): Promise<{ recipe: PublicRecipe; alreadyExisted: boolean }> {
    const user = email ? await this.usersService.findByEmail(email) : null;
    return this.service.addToLibrary({ ...body, submittedByUserId: user?.id ?? null });
  }
}
