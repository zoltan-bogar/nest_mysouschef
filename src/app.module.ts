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
import { Recipe } from './recipes/recipe.entity';
import { MealPlan } from './meal-plans/meal-plan.entity';
import { User } from './users/user.entity';

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
        entities: [Recipe, MealPlan, User],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    RecipesModule,
    CrawlerModule,
    MealPlansModule,
    UsersModule,
    AuthModule,
    ScanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
