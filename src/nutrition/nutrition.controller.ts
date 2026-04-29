import { Controller, Post, Param, ParseIntPipe, Headers, ForbiddenException } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { UsersService } from '../users/users.service';

@Controller('recipes')
export class NutritionController {
  constructor(
    private readonly nutritionService: NutritionService,
    private readonly usersService: UsersService,
  ) {}

  @Post(':id/nutrition')
  async calculate(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-email') email: string,
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !['pro', 'expert', 'admin'].includes(user.tier)) {
      throw new ForbiddenException('Pro tier required');
    }
    return this.nutritionService.calculateForRecipe(id);
  }
}
