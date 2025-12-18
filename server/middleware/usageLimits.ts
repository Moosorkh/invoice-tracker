import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
// import { prisma } from "../utils/prisma";

// TODO: Re-enable usage limits once tenant.maxClients columns are added to database
export async function checkClientLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  next(); // Temporarily disabled
}

/**
 * Middleware to check if tenant can create more invoices
 */
export async function checkInvoiceLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  next(); // Temporarily disabled
}

/**
 * Middleware to check if tenant can create more loans
 */
export async function checkLoanLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  next(); // Temporarily disabled
}

/**
 * Middleware to check if tenant can add more users
 */
export async function checkUserLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  next(); // Temporarily disabled
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
