import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { InvoicingService } from '../invoicing/invoicing.service';

type StripeInstance = InstanceType<typeof Stripe>;
type StripeEvent = ReturnType<StripeInstance['webhooks']['constructEvent']>;

const PRICE_IDS: Record<string, Record<'EUR' | 'HUF', string>> = {
  pro: {
    EUR: process.env.STRIPE_PRO_PRICE_ID ?? '',
    HUF: process.env.STRIPE_PRO_HUF_PRICE_ID ?? '',
  },
  expert: {
    EUR: process.env.STRIPE_EXPERT_PRICE_ID ?? '',
    HUF: process.env.STRIPE_EXPERT_HUF_PRICE_ID ?? '',
  },
};

function tierForProductId(productId: string): User['tier'] | null {
  if (productId === process.env.STRIPE_PRO_PRODUCT_ID) return 'pro';
  if (productId === process.env.STRIPE_EXPERT_PRODUCT_ID) return 'expert';
  return null;
}

@Injectable()
export class BillingService {
  private _stripe: StripeInstance | null = null;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly invoicingService: InvoicingService,
  ) {}

  private get stripe(): StripeInstance {
    if (!this._stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
      this._stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
    }
    return this._stripe;
  }

  async createCheckoutSession(user: User, tier: 'pro' | 'expert', currency: 'EUR' | 'HUF', successUrl: string, cancelUrl: string): Promise<string> {
    const priceId = PRICE_IDS[tier]?.[currency];
    if (!priceId) throw new Error(`No price configured for tier: ${tier} / ${currency}`);

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ email: user.email, metadata: { userId: String(user.id) } });
      customerId = customer.id;
      await this.usersService.updateStripe(user.id, { stripeCustomerId: customerId });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: String(user.id), tier },
    });

    return session.url!;
  }

  async createPortalSession(user: User, returnUrl: string): Promise<string> {
    if (!user.stripeCustomerId) throw new Error('No Stripe customer for user');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  constructWebhookEvent(payload: Buffer, signature: string): StripeEvent {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    );
  }

  async handleWebhookEvent(event: StripeEvent): Promise<void> {
    // TEMP: guard disabled for Számlázz.hu integration test — re-enable after
    // const usingLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    // if (usingLiveKey && !(event as any).livemode) {
    //   this.logger.warn(`Ignoring test-mode webhook while using live key: ${event.type}`);
    //   return;
    // }
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { mode: string; metadata: Record<string, string> | null; customer: string; subscription: string };
        if (session.mode !== 'subscription') break;
        const userId = parseInt(session.metadata?.userId ?? '');
        const tier = session.metadata?.tier as User['tier'] | undefined;
        if (!userId || !tier) break;
        await this.usersService.updateStripe(userId, {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          tier,
        });
        this.logger.log(`User ${userId} upgraded to ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as { id: string; customer: string; status: string; items: { data: { price: { product: string } }[] } };
        const user = await this.usersService.findByStripeCustomerId(sub.customer);
        if (!user) break;
        const productId = sub.items.data[0]?.price?.product ?? '';
        const newTier = tierForProductId(productId);
        if (newTier && sub.status === 'active') {
          await this.usersService.updateStripe(user.id, { tier: newTier, stripeSubscriptionId: sub.id });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as {
          customer: string;
          customer_email: string;
          customer_name: string | null;
          customer_address: { country?: string } | null;
          amount_paid: number;
          total: number;
          currency: string;
          lines: { data: { description: string | null }[] };
          billing_reason: string;
        };
        if (inv.total === 0) break;
        // Only issue HUF invoices for now; EUR requires a paid Számlázz.hu plan
        if (inv.currency !== 'huf') break;
        try {
          const countryCode = inv.customer_address?.country ?? 'HU';
          // Use total (invoice document amount); HUF is zero-decimal so no /100
          const amount = inv.total;
          const description = inv.lines.data[0]?.description ?? 'MySousChef előfizetés';
          await this.invoicingService.createInvoice({
            customerEmail: inv.customer_email,
            customerName: inv.customer_name ?? inv.customer_email,
            amount,
            currency: 'HUF',
            description,
            countryCode,
          });
        } catch (err) {
          this.logger.error(`Failed to create Számlázz.hu invoice: ${err}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { customer: string };
        const user = await this.usersService.findByStripeCustomerId(sub.customer);
        if (!user) break;
        await this.usersService.updateStripe(user.id, { tier: 'free', stripeSubscriptionId: null });
        this.logger.log(`User ${user.id} downgraded to free`);
        break;
      }

      default:
        break;
    }
  }
}
