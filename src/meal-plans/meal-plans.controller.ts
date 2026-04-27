import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { MealPlansService } from './meal-plans.service';

@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly service: MealPlansService) {}

  @Get(':weekStart')
  getWeekPlan(@Param('weekStart') weekStart: string) {
    return this.service.getWeekPlan(weekStart);
  }

  @Put(':weekStart')
  saveWeekPlan(
    @Param('weekStart') weekStart: string,
    @Body() body: { plan: Record<string, Record<string, number | null>> },
  ) {
    return this.service.saveWeekPlan(weekStart, body.plan);
  }
}
