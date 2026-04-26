import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecipesModule } from './recipes/recipes.module';
import { CrawlerModule } from './crawler/crawler.module';

@Module({
  imports: [RecipesModule, CrawlerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
