import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecipesModule } from './recipes/recipes.module';
import { CrawlerModule } from './crawler/crawler.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ScanModule } from './scan/scan.module';
import { CookbooksModule } from './cookbooks/cookbooks.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { PublicRecipesModule } from './public-recipes/public-recipes.module';
import { BillingModule } from './billing/billing.module';
import { MealPlanTemplatesModule } from './meal-plan-templates/meal-plan-templates.module';
import { MealPlanTemplate } from './meal-plan-templates/meal-plan-template.entity';
import { Recipe } from './recipes/recipe.entity';
import { MealPlan } from './meal-plans/meal-plan.entity';
import { User } from './users/user.entity';
import { Cookbook } from './cookbooks/cookbook.entity';
import { IngredientNutrition } from './nutrition/ingredient-nutrition.entity';
import { PublicRecipe } from './public-recipes/public-recipe.entity';
import { InvoiceRequest } from './invoicing/invoice-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [Recipe, MealPlan, User, Cookbook, IngredientNutrition, PublicRecipe, MealPlanTemplate, InvoiceRequest],
        synchronize: config.get<string>('DB_SYNCHRONIZE') !== 'false',
      }),
    }),
    RecipesModule,
    CrawlerModule,
    MealPlansModule,
    UsersModule,
    AuthModule,
    ScanModule,
    CookbooksModule,
    NutritionModule,
    PublicRecipesModule,
    BillingModule,
    MealPlanTemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
