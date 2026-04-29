import { Body, Controller, Get, Headers, NotFoundException, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CookbooksService } from '../cookbooks/cookbooks.service';
import { RecipesService } from '../recipes/recipes.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly usersService: UsersService,
    private readonly cookbooksService: CookbooksService,
    private readonly recipesService: RecipesService,
  ) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; viaToken?: string }) {
    let referredByUserId: number | undefined;
    if (body.viaToken) {
      try {
        const recipe = await this.recipesService.findByShareToken(body.viaToken);
        if (recipe.userId) referredByUserId = recipe.userId;
      } catch { /* invalid or expired token — no referral recorded */ }
    }
    return this.service.register(body.email, body.password, referredByUserId);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.service.login(body.email, body.password);
  }

  @Get('me')
  async me(@Headers('x-user-email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException();
    return { email: user.email, tier: user.tier, scansUsedThisMonth: user.scansUsedThisMonth, hasSubscription: !!user.stripeSubscriptionId };
  }

  @Post('sync')
  async sync(@Body() body: { email: string; locale?: string }) {
    const user = await this.usersService.findOrCreate(body.email);
    const defaultName = body.locale === 'en' ? 'Default' : 'Kezdő';
    await this.cookbooksService.ensureDefaultCookbook(user.id, defaultName);
    return { email: user.email, tier: user.tier };
  }
}
