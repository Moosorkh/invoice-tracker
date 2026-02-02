import { prisma } from "./prisma";
import { Request } from "express";

interface AuditLogData {
  tenantId: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  before?: any;
  after?: any;
  description?: string;
  metadata?: any;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        userEmail: data.userEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        before: data.before,
        after: data.after,
        description: data.description,
        metadata: data.metadata,
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("[AUDIT] Failed to create audit log:", error);
  }
}

/**
 * Log entity creation
 */
export async function logCreate(
  req: Request,
  entity: string,
  entityId: string,
  data: any
): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return;

  await createAuditLog({
    tenantId,
    action: "CREATE",
    entity,
    entityId,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    after: data,
    description: `Created ${entity} ${entityId}`,
  });
}

/**
 * Log entity update
 */
export async function logUpdate(
  req: Request,
  entity: string,
  entityId: string,
  before: any,
  after: any
): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return;

  await createAuditLog({
    tenantId,
    action: "UPDATE",
    entity,
    entityId,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    before,
    after,
    description: `Updated ${entity} ${entityId}`,
  });
}

/**
 * Log entity deletion
 */
export async function logDelete(
  req: Request,
  entity: string,
  entityId: string,
  data: any
): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return;

  await createAuditLog({
    tenantId,
    action: "DELETE",
    entity,
    entityId,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    before: data,
    description: `Deleted ${entity} ${entityId}`,
  });
}

/**
 * Log user login
 */
export async function logLogin(
  email: string,
  tenantId: string,
  userId: string,
  req: Request
): Promise<void> {
  await createAuditLog({
    tenantId,
    action: "LOGIN",
    entity: "User",
    entityId: userId,
    userId,
    userEmail: email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    description: `User ${email} logged in`,
  });
}

/**
 * Log failed login attempt
 */
export async function logLoginFailed(
  email: string,
  tenantId: string | null,
  req: Request,
  reason: string
): Promise<void> {
  if (!tenantId) return;

  await createAuditLog({
    tenantId,
    action: "LOGIN_FAILED",
    entity: "User",
    userEmail: email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    description: `Failed login attempt for ${email}: ${reason}`,
    metadata: { reason },
  });
}

/**
 * Log user logout
 */
export async function logLogout(
  req: Request
): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return;

  await createAuditLog({
    tenantId,
    action: "LOGOUT",
    entity: "User",
    entityId: req.user?.userId,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    description: `User ${req.user?.email} logged out`,
  });
}

/**
 * Log sensitive action with custom metadata
 */
export async function logAction(
  req: Request,
  action: string,
  entity: string,
  description: string,
  metadata?: any
): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return;

  await createAuditLog({
    tenantId,
    action,
    entity,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    description,
    metadata,
  });
}
