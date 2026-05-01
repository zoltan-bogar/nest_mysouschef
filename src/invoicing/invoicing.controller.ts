import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';

@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Post('request')
  async requestInvoice(@Headers('x-user-email') userEmail: string) {
    if (!userEmail) throw new UnauthorizedException();
    const req = await this.invoicingService.createRequest(userEmail);
    return { id: req.id, requestedAt: req.requestedAt };
  }
}
