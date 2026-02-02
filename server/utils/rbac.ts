import { UserRole } from "@prisma/client";

/**
 * Permission hierarchy - higher roles have all permissions of lower roles
 */
const ROLE_HIERARCHY: UserRole[] = [
  "VIEWER",
  "OPERATOR",
  "MANAGER",
  "ADMIN",
  "OWNER",
];

/**
 * Check if a user's role has at least the required permission level
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Check if user has permission for a specific action
 */
export function canPerformAction(
  userRole: UserRole,
  action: "create" | "read" | "update" | "delete",
  entity: string
): boolean {
  // Read access for everyone
  if (action === "read") {
    return true;
  }

  // VIEWER can only read
  if (userRole === "VIEWER") {
    return false;
  }

  // OPERATOR can create/update invoices and payments
  if (userRole === "OPERATOR") {
    if (action === "delete") return false;
    return ["Invoice", "Payment", "InvoiceItem"].includes(entity);
  }

  // MANAGER can create/update/delete clients, invoices, loans, payments
  if (userRole === "MANAGER") {
    return ["Client", "Invoice", "Payment", "Loan", "InvoiceItem", "ClientUser"].includes(entity);
  }

  // ADMIN can do everything except delete tenant or manage billing
  if (userRole === "ADMIN") {
    return entity !== "Tenant";
  }

  // OWNER can do everything
  if (userRole === "OWNER") {
    return true;
  }

  return false;
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(userRole: UserRole): boolean {
  return hasRole(userRole, "ADMIN");
}

/**
 * Check if user can manage billing
 */
export function canManageBilling(userRole: UserRole): boolean {
  return userRole === "OWNER";
}

/**
 * Check if user can delete tenant
 */
export function canDeleteTenant(userRole: UserRole): boolean {
  return userRole === "OWNER";
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    VIEWER: "Viewer",
    OPERATOR: "Operator",
    MANAGER: "Manager",
    ADMIN: "Administrator",
    OWNER: "Owner",
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    VIEWER: "Read-only access to all data",
    OPERATOR: "Can create and edit invoices and payments",
    MANAGER: "Can manage clients, loans, invoices, and payments",
    ADMIN: "Full access except billing and tenant deletion",
    OWNER: "Full access to everything including billing",
  };
  return descriptions[role];
}
