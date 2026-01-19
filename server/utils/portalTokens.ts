import { prisma } from "./prisma";
import crypto from "crypto";

export type TokenType = "invite" | "reset" | "magic_link";

export async function generatePortalToken(
  tenantId: string,
  email: string,
  type: TokenType,
  portalUserId?: string
): Promise<{ token: string; expiresAt: Date }> {
  // Generate cryptographically secure random token
  const token = crypto.randomBytes(32).toString("hex");
  
  // Set expiration: invite tokens last 7 days, reset tokens last 1 hour
  const expiresAt = new Date();
  if (type === "invite") {
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  } else {
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour
  }

  // Invalidate existing unused tokens of same type for this user
  await prisma.portalAuthToken.updateMany({
    where: {
      email: email.toLowerCase(),
      tenantId,
      type,
      used: false,
    },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });

  // Create new token
  await prisma.portalAuthToken.create({
    data: {
      type,
      email: email.toLowerCase(),
      tenantId,
      portalUserId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function validatePortalToken(token: string, type: TokenType) {
  const authToken = await prisma.portalAuthToken.findUnique({
    where: { token },
  });

  if (!authToken) {
    return { valid: false, error: "Invalid token" };
  }

  if (authToken.used) {
    return { valid: false, error: "Token already used" };
  }

  if (authToken.type !== type) {
    return { valid: false, error: "Invalid token type" };
  }

  if (new Date() > authToken.expiresAt) {
    return { valid: false, error: "Token expired" };
  }

  return {
    valid: true,
    authToken,
  };
}

export async function markTokenAsUsed(token: string) {
  await prisma.portalAuthToken.update({
    where: { token },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });
}
