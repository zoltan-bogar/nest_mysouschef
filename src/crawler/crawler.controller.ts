import {Body, Controller, HttpCode, Post} from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { RecipeModel } from '../recipes/recipes.interface';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post()
  @HttpCode(200)
  public crawl(@Body() url: any)/*: RecipeModel*/ {
    return this.crawlerService.crawl(url);
  }
}
