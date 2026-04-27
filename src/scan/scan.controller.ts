import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScanService } from './scan.service';
import { UsersService } from '../users/users.service';

@Controller('scan')
export class ScanController {
  constructor(
    private readonly scanService: ScanService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async scan(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-email') email: string | undefined,
  ) {
    if (!file) throw new BadRequestException('No image provided.');

    const user = email ? await this.usersService.findByEmail(email) : null;
    if (!user || user.tier === 'free') {
      throw new ForbiddenException({ message: 'Recipe scanning is a Pro feature.', code: 'SCAN_REQUIRES_PRO' });
    }

    const result = await this.usersService.checkAndIncrementScan(user.id);
    if (!result.allowed) {
      throw new ForbiddenException({ message: 'Monthly scan limit reached. Upgrade to Expert for unlimited scans.', code: 'SCAN_LIMIT_REACHED' });
    }

    return this.scanService.extractRecipe(file.buffer, file.mimetype);
  }
}
