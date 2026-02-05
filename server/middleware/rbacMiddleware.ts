import { RequestHandler } from "express";
import { UserRole } from "@prisma/client";
import { canPerformAction, hasRole } from "../utils/rbac";

/**
 * Middleware to require a minimum role level
 * Higher roles automatically have access (OWNER > ADMIN > MANAGER > OPERATOR > VIEWER)
 */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user?.role) {
      res.status(403).json({ error: "Access denied: No role assigned" });
      return;
    }

    // Staff only - block client portal users
    if (req.user.userType === "client") {
      res.status(403).json({ error: "Access denied: Staff only" });
      return;
    }

    const userRole = req.user.role as UserRole;
    
    // Check if user has at least one of the allowed roles
    const hasAccess = allowedRoles.some(requiredRole => 
      hasRole(userRole, requiredRole)
    );

    if (!hasAccess) {
      res.status(403).json({ 
        error: "Insufficient permissions",
        required: allowedRoles,
        current: userRole
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check permission for a specific action on an entity
 */
export function requirePermission(
  action: "create" | "read" | "update" | "delete",
  entity: string
): RequestHandler {
  return (req, res, next) => {
    if (!req.user?.role) {
      res.status(403).json({ error: "Access denied: No role assigned" });
      return;
    }

    // Staff only - block client portal users
    if (req.user.userType === "client") {
      res.status(403).json({ error: "Access denied: Staff only" });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!canPerformAction(userRole, action, entity)) {
      res.status(403).json({
        error: `Insufficient permissions to ${action} ${entity}`,
        role: userRole,
        required: `Permission to ${action} ${entity}`
      });
      return;
    }

    next();
  };
}

/**
 * Ensure only OWNER can access (billing, tenant deletion)
 */
export const requireOwner = requireRole("OWNER");

/**
 * Ensure at least ADMIN (user management, full data access)
 */
export const requireAdmin = requireRole("ADMIN");

/**
 * Ensure at least MANAGER (client/loan management)
 */
export const requireManager = requireRole("MANAGER");

/**
 * Ensure at least OPERATOR (invoice/payment creation)
 */
export const requireOperator = requireRole("OPERATOR");
