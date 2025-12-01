import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
  typescript: true,
});

// Plan configuration with pricing and limits
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    stripePriceId: null,
    limits: {
      maxClients: 10,
      maxInvoices: 20,
      maxLoans: 5,
      maxUsers: 1,
    },
    features: [
      "Up to 10 clients",
      "Up to 20 invoices per month",
      "Up to 5 loans",
      "1 user",
      "Basic reporting",
    ],
  },
  starter: {
    name: "Starter",
    price: 29,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    limits: {
      maxClients: 50,
      maxInvoices: 200,
      maxLoans: 50,
      maxUsers: 5,
    },
    features: [
      "Up to 50 clients",
      "Up to 200 invoices per month",
      "Up to 50 loans",
      "5 users",
      "Advanced reporting",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    price: 99,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    limits: {
      maxClients: -1, // unlimited
      maxInvoices: -1, // unlimited
      maxLoans: -1, // unlimited
      maxUsers: -1, // unlimited
    },
    features: [
      "Unlimited clients",
      "Unlimited invoices",
      "Unlimited loans",
      "Unlimited users",
      "Priority support",
      "Custom branding",
      "API access",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 299,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    limits: {
      maxClients: -1, // unlimited
      maxInvoices: -1, // unlimited
      maxLoans: -1, // unlimited
      maxUsers: -1, // unlimited
    },
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "Advanced security features",
    ],
  },
};

/**
 * Create a Stripe customer for a tenant
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  tenantId: string
): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      tenantId,
    },
  });
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  tenantId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
    },
  });
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Update subscription plan
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
