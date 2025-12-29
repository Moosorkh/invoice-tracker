import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

/**
 * Auth middleware specifically for client portal users
 * Validates JWT and ensures user is a client portal user
 */
export const clientPortalAuthMiddleware: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // Ensure this is a client portal user token
    if (payload.userType !== "client") {
      res.status(403).json({ error: "Access denied: Not a client portal user" });
      return;
    }

    if (!payload.clientId) {
      res.status(403).json({ error: "Invalid client portal token" });
      return;
    }

    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      userType: "client",
      clientId: payload.clientId,
    };
    
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
};

/**
 * Middleware to ensure user is a staff member (not client portal)
 */
export const staffOnlyMiddleware: RequestHandler = (req, res, next) => {
  if (req.user?.userType === "client") {
    res.status(403).json({ error: "Access denied: Staff only" });
    return;
  }
  next();
};
