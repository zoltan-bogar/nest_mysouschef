import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { Recipe } from './recipe.entity';
import { UsersModule } from '../users/users.module';
import { CrawlerModule } from '../crawler/crawler.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe]), UsersModule, CrawlerModule],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
