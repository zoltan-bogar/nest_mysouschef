import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicRecipe } from './public-recipe.entity';
import { PublicRecipesService } from './public-recipes.service';
import { PublicRecipesController } from './public-recipes.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([PublicRecipe]), UsersModule],
  providers: [PublicRecipesService],
  controllers: [PublicRecipesController],
  exports: [PublicRecipesService],
})
export class PublicRecipesModule {}
