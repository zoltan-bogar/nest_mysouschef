import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Headers } from '@nestjs/common';
import { MealPlanTemplatesService } from './meal-plan-templates.service';
import { UsersService } from '../users/users.service';
import { MealPlanTemplate } from './meal-plan-template.entity';

@Controller('meal-plan-templates')
export class MealPlanTemplatesController {
  constructor(
    private readonly service: MealPlanTemplatesService,
    private readonly usersService: UsersService,
  ) {}

  private async requireUserId(email?: string): Promise<number> {
    if (!email) throw new ForbiddenException('Must be signed in.');
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new ForbiddenException('Must be signed in.');
    return user.id;
  }

  @Get()
  findAll(@Headers('x-user-email') email: string): Promise<MealPlanTemplate[]> {
    return this.requireUserId(email).then(userId => this.service.findAll(userId));
  }

  @Post()
  create(
    @Headers('x-user-email') email: string,
    @Body() body: { name: string; plan: Record<string, Record<string, number[]>> },
  ): Promise<MealPlanTemplate> {
    return this.requireUserId(email).then(userId => this.service.create(body.name, body.plan, userId));
  }

  @Delete(':id')
  @HttpCode(200)
  delete(
    @Headers('x-user-email') email: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.requireUserId(email).then(userId => this.service.delete(id, userId));
  }
}
