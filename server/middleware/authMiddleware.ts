import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId?: string;
        role?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const authMiddleware: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // If tenantId is in token (after migration), use it
    if (payload.tenantId) {
      req.user = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
      };
      next();
      return;
    }

    // Legacy: Get first tenant for user (backward compatibility during migration)
    const userTenant = await prisma.userTenant.findFirst({
      where: { userId: payload.userId },
      select: { tenantId: true, role: true },
    });

    req.user = {
      userId: payload.userId,
      tenantId: userTenant?.tenantId,
      role: userTenant?.role,
    };
    
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
};
