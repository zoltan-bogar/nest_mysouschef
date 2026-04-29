import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPlanTemplate } from './meal-plan-template.entity';
import { MealPlanTemplatesService } from './meal-plan-templates.service';
import { MealPlanTemplatesController } from './meal-plan-templates.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([MealPlanTemplate]), UsersModule],
  providers: [MealPlanTemplatesService],
  controllers: [MealPlanTemplatesController],
})
export class MealPlanTemplatesModule {}
