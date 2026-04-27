import { Body, Controller, Get, Headers, NotFoundException, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() body: { email: string; password: string }) {
    return this.service.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.service.login(body.email, body.password);
  }

  @Get('me')
  async me(@Headers('x-user-email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException();
    return { email: user.email, tier: user.tier, scansUsedThisMonth: user.scansUsedThisMonth };
  }

  @Post('sync')
  async sync(@Body() body: { email: string }) {
    const user = await this.usersService.findOrCreate(body.email);
    return { email: user.email, tier: user.tier };
  }
}
