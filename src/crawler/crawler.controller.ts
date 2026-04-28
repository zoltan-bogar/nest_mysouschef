import { Body, Controller, ForbiddenException, Headers, HttpCode, Post } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { UsersService } from '../users/users.service';

@Controller('crawler')
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(200)
  public crawl(@Body() url: any) {
    return this.crawlerService.crawl(url);
  }

  @Post('translate')
  @HttpCode(200)
  public async translate(
    @Headers('x-user-email') email: string | undefined,
    @Body() recipe: Record<string, any>,
  ) {
    const user = email ? await this.usersService.findByEmail(email) : null;
    if (!user || (user.tier !== 'expert' && user.tier !== 'admin')) {
      throw new ForbiddenException({ message: 'Translation requires an Expert subscription.', code: 'EXPERT_REQUIRED' });
    }
    return this.crawlerService.translate(recipe);
  }
}
