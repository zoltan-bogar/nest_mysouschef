import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';

@Module({
  imports: [ConfigModule],
  providers: [CrawlerService],
  controllers: [CrawlerController],
})
export class CrawlerModule {}
