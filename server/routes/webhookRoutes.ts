import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { constructWebhookEvent, PLANS } from "../utils/stripe";
import Stripe from "stripe";

const router = Router();

/**
 * Stripe webhook handler
 * Important: This route should NOT use the authMiddleware
 * and should use raw body parser
 */
router.post("/stripe", async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  if (!signature || Array.isArray(signature)) {
    res.status(400).json({ error: "Missing or invalid stripe-signature header" });
    return;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let event: Stripe.Event;

  try {
    // Construct and verify webhook event
    event = constructWebhookEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  console.log(`Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error(`Error processing webhook: ${err.message}`);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const tenantId = session.metadata?.tenantId;
  const subscriptionId = session.subscription as string;

  if (!tenantId || !subscriptionId) {
    console.error("Missing tenantId or subscriptionId in checkout session");
    return;
  }

  console.log(
    `Checkout completed for tenant ${tenantId}, subscription ${subscriptionId}`
  );

  // Subscription will be handled by subscription.created event
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find tenant by Stripe customer ID
  const tenant = await prisma.tenant.findFirst({
    where: { billingCustomerId: customerId },
  });

  if (!tenant) {
    console.error(`Tenant not found for customer ${customerId}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  console.log(`Updating subscription for tenant ${tenant.id}, plan: ${plan}`);

  // Upsert subscription
  const subData = subscription as any;
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      tenantId: tenant.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeProductId: subscription.items.data[0]?.price.product as string,
      plan,
      status: subscription.status,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end || false,
      canceledAt: subData.canceled_at
        ? new Date(subData.canceled_at * 1000)
        : null,
    },
    update: {
      stripePriceId: priceId,
      stripeProductId: subscription.items.data[0]?.price.product as string,
      plan,
      status: subscription.status,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end || false,
      canceledAt: subData.canceled_at
        ? new Date(subData.canceled_at * 1000)
        : null,
    },
  });

  // Update tenant plan and limits
  const planConfig = PLANS[plan as keyof typeof PLANS] || PLANS.free;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      plan,
      status: subscription.status === "active" ? "active" : tenant.status,
      maxClients: planConfig.limits.maxClients,
      maxInvoices: planConfig.limits.maxInvoices,
      maxLoans: planConfig.limits.maxLoans,
      maxUsers: planConfig.limits.maxUsers,
    },
  });
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: ${subscription.id}`);

  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    include: { tenant: true },
  });

  if (!existingSubscription) {
    console.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  // Mark subscription as canceled
  await prisma.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });

  // Downgrade tenant to free plan
  const freePlan = PLANS.free;
  await prisma.tenant.update({
    where: { id: existingSubscription.tenantId },
    data: {
      plan: "free",
      maxClients: freePlan.limits.maxClients,
      maxInvoices: freePlan.limits.maxInvoices,
      maxLoans: freePlan.limits.maxLoans,
      maxUsers: freePlan.limits.maxUsers,
    },
  });
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    return;
  }

  console.log(`Payment succeeded for subscription ${subscriptionId}`);

  // Update subscription status if needed
  await prisma.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscriptionId,
      status: { in: ["past_due", "incomplete"] },
    },
    data: {
      status: "active",
    },
  });

  // Update tenant status
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { status: "active" },
    });
  }
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    return;
  }

  console.log(`Payment failed for subscription ${subscriptionId}`);

  // Update subscription status
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "past_due" },
  });

  // Update tenant status
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { status: "suspended" },
    });
  }
}

/**
 * Helper to determine plan from Stripe price ID
 */
function getPlanFromPriceId(priceId: string | undefined): string {
  for (const [planKey, planConfig] of Object.entries(PLANS)) {
    if (planConfig.stripePriceId === priceId) {
      return planKey;
    }
  }
  return "free";
}

export default router;
