import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { TenantRequest } from "./tenantResolver";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId?: string;
        role?: string;
        userType?: "staff" | "client"; // Distinguish staff vs client portal users
        clientId?: string; // For client portal users
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
    
    // Validate tenant context if tenant is resolved (from /t/:slug path)
    const tenantReq = req as TenantRequest;
    if (tenantReq.tenant && payload.tenantId && tenantReq.tenant.id !== payload.tenantId) {
      res.status(403).json({ error: "Token does not match tenant context" });
      return;
    }
    
    // If tenantId is in token (after migration), use it
    if (payload.tenantId) {
      req.user = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        userType: payload.userType || "staff",
        clientId: payload.clientId,
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
    res.status(401).json({ error: "Unauthorized" });
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
