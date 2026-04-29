import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { UsersModule } from '../users/users.module';
import { InvoicingModule } from '../invoicing/invoicing.module';

@Module({
  imports: [UsersModule, InvoicingModule],
  providers: [BillingService],
  controllers: [BillingController],
})
export class BillingModule {}
