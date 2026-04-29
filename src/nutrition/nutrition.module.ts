import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { IngredientNutrition } from './ingredient-nutrition.entity';
import { Recipe } from '../recipes/recipe.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngredientNutrition, Recipe]),
    UsersModule,
  ],
  controllers: [NutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
