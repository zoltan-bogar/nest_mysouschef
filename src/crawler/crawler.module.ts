import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [CrawlerService],
  controllers: [CrawlerController],
  exports: [CrawlerService],
})
export class CrawlerModule {}
