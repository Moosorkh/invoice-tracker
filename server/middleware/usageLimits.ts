import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
import { prisma } from "../utils/prisma";

export async function checkClientLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.user!.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: { clients: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  // -1 means unlimited
  if (tenant.maxClients !== -1 && tenant._count.clients >= tenant.maxClients) {
    res.status(403).json({
      error: "Client limit reached",
      message: `Your current plan allows up to ${tenant.maxClients} clients. Please upgrade to add more.`,
      limit: tenant.maxClients,
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
    include: {
      _count: {
        select: { invoices: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  // -1 means unlimited
  if (
    tenant.maxInvoices !== -1 &&
    tenant._count.invoices >= tenant.maxInvoices
  ) {
    res.status(403).json({
      error: "Invoice limit reached",
      message: `Your current plan allows up to ${tenant.maxInvoices} invoices. Please upgrade to add more.`,
      limit: tenant.maxInvoices,
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
    include: {
      _count: {
        select: { loans: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  // -1 means unlimited
  if (tenant.maxLoans !== -1 && tenant._count.loans >= tenant.maxLoans) {
    res.status(403).json({
      error: "Loan limit reached",
      message: `Your current plan allows up to ${tenant.maxLoans} loans. Please upgrade to add more.`,
      limit: tenant.maxLoans,
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
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  // -1 means unlimited
  if (tenant.maxUsers !== -1 && tenant._count.users >= tenant.maxUsers) {
    res.status(403).json({
      error: "User limit reached",
      message: `Your current plan allows up to ${tenant.maxUsers} users. Please upgrade to add more.`,
      limit: tenant.maxUsers,
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
