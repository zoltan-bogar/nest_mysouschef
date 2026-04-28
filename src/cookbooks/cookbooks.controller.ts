import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CookbooksService } from './cookbooks.service';
import { UsersService } from '../users/users.service';

@Controller('cookbooks')
export class CookbooksController {
  constructor(
    private readonly cookbooksService: CookbooksService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async findAll(@Headers('x-user-email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return [];
    await this.cookbooksService.ensureDefaultCookbook(user.id);
    return this.cookbooksService.findAllByUser(user.id);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string,
    @Body() body: { name: string },
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;
    return this.cookbooksService.create(body.name, user.id);
  }

  @Patch(':id')
  async rename(
    @Headers('x-user-email') email: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;
    return this.cookbooksService.rename(id, user.id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Headers('x-user-email') email: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;
    await this.cookbooksService.delete(id, user.id);
  }

  @Post(':id/recipes/:recipeId')
  @HttpCode(200)
  addRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
  ) {
    return this.cookbooksService.addRecipe(id, recipeId);
  }

  @Delete(':id/recipes/:recipeId')
  @HttpCode(204)
  removeRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
  ) {
    return this.cookbooksService.removeRecipe(id, recipeId);
  }
}
