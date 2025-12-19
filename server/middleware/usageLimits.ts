import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
import { prisma } from "../utils/prisma";
import { getPlanLimits } from "../utils/planLimits";

export async function checkClientLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.user!.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      _count: {
        select: { clients: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const limits = getPlanLimits(tenant.plan);
  const maxClients = limits.maxClients;

  // -1 means unlimited
  if (maxClients !== -1 && tenant._count.clients >= maxClients) {
    res.status(403).json({
      error: "Client limit reached",
      message: `Your current plan allows up to ${maxClients} clients. Please upgrade to add more.`,
      limit: maxClients,
      current: tenant._count.clients,
      upgradeRequired: true,
    });
    return;
  }

  next();
}

/**
 * Middleware to check if tenant can create more invoices
 */
export async function checkInvoiceLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.user!.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      _count: {
        select: { invoices: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const limits = getPlanLimits(tenant.plan);
  const maxInvoices = limits.maxInvoices;

  if (maxInvoices !== -1 && tenant._count.invoices >= maxInvoices) {
    res.status(403).json({
      error: "Invoice limit reached",
      message: `Your current plan allows up to ${maxInvoices} invoices. Please upgrade to add more.`,
      limit: maxInvoices,
      current: tenant._count.invoices,
      upgradeRequired: true,
    });
    return;
  }

  next();
}

/**
 * Middleware to check if tenant can create more loans
 */
export async function checkLoanLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.user!.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      _count: {
        select: { loans: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const limits = getPlanLimits(tenant.plan);
  const maxLoans = limits.maxLoans;

  if (maxLoans !== -1 && tenant._count.loans >= maxLoans) {
    res.status(403).json({
      error: "Loan limit reached",
      message: `Your current plan allows up to ${maxLoans} loans. Please upgrade to add more.`,
      limit: maxLoans,
      current: tenant._count.loans,
      upgradeRequired: true,
    });
    return;
  }

  next();
}

/**
 * Middleware to check if tenant can add more users
 */
export async function checkUserLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.user!.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      _count: {
        select: { users: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const limits = getPlanLimits(tenant.plan);
  const maxUsers = limits.maxUsers;

  if (maxUsers !== -1 && tenant._count.users >= maxUsers) {
    res.status(403).json({
      error: "User limit reached",
      message: `Your current plan allows up to ${maxUsers} users. Please upgrade to add more.`,
      limit: maxUsers,
      current: tenant._count.users,
      upgradeRequired: true,
    });
    return;
  }

  next();
}

/**
 * Middleware to check if tenant's subscription is active
 */
export async function checkSubscriptionStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.user!.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  if (tenant.status === "suspended") {
    res.status(403).json({
      error: "Account suspended",
      message:
        "Your account has been suspended due to payment issues. Please update your payment method.",
      subscriptionRequired: true,
    });
    return;
  }

  if (tenant.status === "canceled") {
    res.status(403).json({
      error: "Account canceled",
      message: "Your account has been canceled. Please contact support.",
      subscriptionRequired: true,
    });
    return;
  }

  next();
}
