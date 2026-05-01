import { Body, Controller, ForbiddenException, Get, Headers, NotFoundException, Param, Patch } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { InvoicingService } from '../invoicing/invoicing.service';

const VALID_TIERS: User['tier'][] = ['free', 'pro', 'expert', 'admin'];

@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invoicingService: InvoicingService,
  ) {}

  private async requireAdmin(email: string) {
    const caller = await this.usersService.findByEmail(email);
    if (!caller || caller.tier !== 'admin') throw new ForbiddenException('Admin only');
  }

  @Get('users')
  async listUsers(@Headers('x-admin-email') adminEmail: string) {
    await this.requireAdmin(adminEmail);
    const users = await this.usersService.findAll();
    return users.map(u => ({
      email: u.email,
      tier: u.tier,
      scansUsedThisMonth: u.scansUsedThisMonth,
      createdAt: u.createdAt,
    }));
  }

  @Patch('users/:email/tier')
  async setTier(
    @Headers('x-admin-email') adminEmail: string,
    @Param('email') targetEmail: string,
    @Body() body: { tier: string },
  ) {
    await this.requireAdmin(adminEmail);
    if (!VALID_TIERS.includes(body.tier as User['tier'])) {
      throw new NotFoundException(`Invalid tier: ${body.tier}`);
    }
    const updated = await this.usersService.setTier(targetEmail, body.tier as User['tier']);
    return { email: updated.email, tier: updated.tier };
  }

  @Get('invoice-requests')
  async listInvoiceRequests(@Headers('x-admin-email') adminEmail: string) {
    await this.requireAdmin(adminEmail);
    const requests = await this.invoicingService.listRequests();
    return requests.map(r => ({
      id: r.id,
      userEmail: r.userEmail,
      status: r.status,
      requestedAt: r.requestedAt,
    }));
  }

  @Patch('invoice-requests/:id/done')
  async markInvoiceDone(
    @Headers('x-admin-email') adminEmail: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(adminEmail);
    await this.invoicingService.markDone(parseInt(id));
    return { ok: true };
  }
}
