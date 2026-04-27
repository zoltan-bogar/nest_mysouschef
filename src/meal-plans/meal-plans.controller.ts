import { Body, Controller, Get, Headers, Param, Put } from '@nestjs/common';
import { MealPlansService } from './meal-plans.service';
import { UsersService } from '../users/users.service';

@Controller('meal-plans')
export class MealPlansController {
  constructor(
    private readonly service: MealPlansService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveUserId(email?: string): Promise<number | undefined> {
    if (!email) return undefined;
    const user = await this.usersService.findByEmail(email);
    return user?.id;
  }

  @Get(':weekStart')
  async getWeekPlan(
    @Param('weekStart') weekStart: string,
    @Headers('x-user-email') email: string | undefined,
  ) {
    const userId = await this.resolveUserId(email);
    return this.service.getWeekPlan(weekStart, userId);
  }

  @Put(':weekStart')
  async saveWeekPlan(
    @Param('weekStart') weekStart: string,
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { plan: Record<string, Record<string, number | null>> },
  ) {
    const userId = await this.resolveUserId(email);
    return this.service.saveWeekPlan(weekStart, body.plan, userId);
  }
}
