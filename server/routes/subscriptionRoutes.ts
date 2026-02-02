import { Router, Response } from "express";
import { AuthRequest } from "../types/express";
import { prisma } from "../utils/prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  stripe,
  PLANS,
  createStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  resumeSubscription,
  updateSubscriptionPlan,
} from "../utils/stripe";
import { routeHandler } from "../utils/routeHandler";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * Get available plans
 */
router.get(
  "/plans",
  routeHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      plans: Object.entries(PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: plan.price,
        limits: plan.limits,
        features: plan.features,
      })),
    });
  })
);

/**
 * Get current subscription status
 */
router.get(
  "/status",
  routeHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ["active", "trialing", "past_due"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            clients: true,
            invoices: true,
            loans: true,
            users: true,
          },
        },
      },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    const currentSubscription = tenant.subscriptions[0] || null;
    const planConfig = PLANS[tenant.plan as keyof typeof PLANS] || PLANS.free;

    res.json({
      currentPlan: tenant.plan,
      status: tenant.status,
      subscription: currentSubscription,
      usage: {
        clients: tenant._count.clients,
        invoices: tenant._count.invoices,
        loans: tenant._count.loans,
        users: tenant._count.users,
      },
      limits: planConfig.limits,
      planConfig,
    });
  })
);

/**
 * Create checkout session for subscription upgrade
 */
router.post(
  "/checkout",
  routeHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { plan } = req.body;

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    if (plan === "free") {
      res.status(400).json({ error: "Cannot create checkout for free plan" });
      return;
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig.stripePriceId) {
      res.status(400).json({
        error: "Stripe price ID not configured for this plan",
      });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Create or get Stripe customer
    let customerId = tenant.billingCustomerId;
    if (!customerId) {
      const user = await prisma.user.findFirst({
        where: {
          tenants: {
            some: {
              tenantId,
              role: "OWNER",
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: "Tenant owner not found" });
        return;
      }

      const customer = await createStripeCustomer(
        user.email,
        tenant.name,
        tenantId!
      );

      customerId = customer.id;

      await prisma.tenant.update({
        where: { id: tenantId! },
        data: { billingCustomerId: customerId },
      });
    }

    // Create checkout session
    // Construct base URL from request (works for monorepo deployment)
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;
    
    const session = await createCheckoutSession(
      customerId,
      planConfig.stripePriceId,
      tenantId!,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`
    );

    res.json({ sessionId: session.id, url: session.url });
  })
);

/**
 * Create billing portal session
 */
router.post(
  "/portal",
  routeHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.billingCustomerId) {
      res.status(400).json({
        error: "No billing customer found. Please subscribe to a plan first.",
      });
      return;
    }

    // Construct base URL from request (works for monorepo deployment)
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const session = await createBillingPortalSession(
      tenant.billingCustomerId,
      `${baseUrl}/billing`
    );

    res.json({ url: session.url });
  })
);

/**
 * Cancel subscription
 */
router.post(
  "/cancel",
  routeHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { immediately } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trialing"] },
      },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      res.status(404).json({ error: "No active subscription found" });
      return;
    }

    const updatedSubscription = await cancelSubscription(
      subscription.stripeSubscriptionId,
      !immediately
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        canceledAt: immediately ? new Date() : null,
        status: immediately ? "canceled" : "active",
      },
    });

    res.json({
      success: true,
      message: immediately
        ? "Subscription canceled immediately"
        : "Subscription will cancel at period end",
    });
  })
);

/**
 * Resume canceled subscription
 */
router.post(
  "/resume",
  routeHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;

    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        cancelAtPeriodEnd: true,
        status: "active",
      },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      res.status(404).json({ error: "No subscription scheduled for cancellation" });
      return;
    }

    await resumeSubscription(subscription.stripeSubscriptionId);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });

    res.json({
      success: true,
      message: "Subscription resumed successfully",
    });
  })
);

/**
 * Change subscription plan
 */
router.post(
  "/change-plan",
  routeHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { plan } = req.body;

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];

    if (plan === "free") {
      res.status(400).json({
        error: "Please cancel your subscription to downgrade to free plan",
      });
      return;
    }

    if (!planConfig.stripePriceId) {
      res.status(400).json({
        error: "Stripe price ID not configured for this plan",
      });
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trialing"] },
      },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      res.status(404).json({
        error: "No active subscription found. Please create a new subscription.",
      });
      return;
    }

    await updateSubscriptionPlan(
      subscription.stripeSubscriptionId,
      planConfig.stripePriceId
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        stripePriceId: planConfig.stripePriceId,
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
      },
    });

    res.json({
      success: true,
      message: "Subscription plan updated successfully",
    });
  })
);

export default router;
