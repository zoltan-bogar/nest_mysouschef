import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CookbooksController } from './cookbooks.controller';
import { CookbooksService } from './cookbooks.service';
import { Cookbook } from './cookbook.entity';
import { Recipe } from '../recipes/recipe.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cookbook, Recipe]), UsersModule],
  controllers: [CookbooksController],
  providers: [CookbooksService],
  exports: [CookbooksService],
})
export class CookbooksModule {}
