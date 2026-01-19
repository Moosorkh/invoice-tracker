import crypto from "crypto";
import { prisma } from "../utils/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY_MINUTES = 15; // Magic link valid for 15 minutes

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

/**
 * Generate a magic link token for client portal access
 */
export async function generatePortalAuthToken(
  email: string,
  tenantId: string
): Promise<string> {
  // Generate a random secure token
  const token = crypto.randomBytes(32).toString("hex");
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);

  // Store token in database
  await prisma.portalAuthToken.create({
    data: {
      type: "magic_link",
      email,
      tenantId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify magic link token and generate JWT
 */
export async function verifyPortalAuthToken(
  token: string,
  tenantId: string
): Promise<{ success: boolean; jwt?: string; error?: string }> {
  // Find token in database
  const authToken = await prisma.portalAuthToken.findUnique({
    where: { token },
  });

  if (!authToken) {
    return { success: false, error: "Invalid token" };
  }

  if (authToken.used) {
    return { success: false, error: "Token already used" };
  }

  if (authToken.tenantId !== tenantId) {
    return { success: false, error: "Token does not match tenant" };
  }

  if (new Date() > authToken.expiresAt) {
    return { success: false, error: "Token expired" };
  }

  // Mark token as used
  await prisma.portalAuthToken.update({
    where: { token },
    data: { used: true },
  });

  // Find client user
  const clientUser = await prisma.clientUser.findUnique({
    where: {
      tenantId_email: {
        tenantId,
        email: authToken.email,
      },
    },
    include: {
      client: true,
    },
  });

  if (!clientUser) {
    return { success: false, error: "Client user not found" };
  }

  if (clientUser.status !== "active") {
    return { success: false, error: "Client user account is not active" };
  }

  // Generate JWT for client portal session
  const jwtToken = jwt.sign(
    {
      userId: clientUser.id,
      tenantId: clientUser.tenantId,
      clientId: clientUser.clientId,
      userType: "client",
    },
    JWT_SECRET,
    { expiresIn: "7d" } // Client portal sessions last 7 days
  );

  return { success: true, jwt: jwtToken };
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.portalAuthToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Send magic link email (placeholder - integrate with your email service)
 */
export async function sendMagicLinkEmail(
  email: string,
  tenantSlug: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const magicLink = `${baseUrl}/t/${tenantSlug}/portal/auth/verify?token=${token}`;
  
  // TODO: Integrate with SendGrid, Mailgun, or other email service
  console.log(`
==============================================
MAGIC LINK FOR: ${email}
Tenant: ${tenantSlug}
Link: ${magicLink}
Expires in ${TOKEN_EXPIRY_MINUTES} minutes
==============================================
  `);
  
  // In production, replace with:
  // await emailService.send({
  //   to: email,
  //   subject: "Your login link",
  //   html: `<p>Click here to log in: <a href="${magicLink}">Access Portal</a></p>`
  // });
}
