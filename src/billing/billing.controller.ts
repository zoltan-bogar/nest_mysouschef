import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  NotFoundException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { UsersService } from '../users/users.service';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly usersService: UsersService,
  ) {}

  @Post('checkout')
  async checkout(
    @Headers('x-user-email') email: string,
    @Body() body: { tier: 'pro' | 'expert'; currency?: 'EUR' | 'HUF' },
  ): Promise<{ url: string }> {
    if (!['pro', 'expert'].includes(body.tier)) throw new BadRequestException('Invalid tier');
    const currency = body.currency === 'HUF' ? 'HUF' : 'EUR';
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const url = await this.billingService.createCheckoutSession(
      user,
      body.tier,
      currency,
      `${APP_URL}/upgrade/success?tier=${body.tier}`,
      `${APP_URL}/upgrade`,
    );
    return { url };
  }

  @Post('portal')
  async portal(@Headers('x-user-email') email: string): Promise<{ url: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const url = await this.billingService.createPortalSession(user, `${APP_URL}/upgrade`);
    return { url };
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const payload = req.rawBody;
    if (!payload) throw new BadRequestException('Missing raw body');
    let event;
    try {
      event = this.billingService.constructWebhookEvent(payload, signature);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    await this.billingService.handleWebhookEvent(event);
    return { received: true };
  }
}
