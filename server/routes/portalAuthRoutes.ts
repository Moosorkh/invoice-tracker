import { Router, Response } from "express";
import { TenantRequest } from "../middleware/tenantResolver";
import { routeHandler } from "../utils/routeHandler";
import {
  generatePortalAuthToken,
  verifyPortalAuthToken,
  sendMagicLinkEmail,
} from "../utils/portalAuth";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * Password-based login for client portal
 * POST /t/:slug/portal/auth/login
 */
router.post(
  "/login",
  routeHandler(async (req: TenantRequest, res: Response) => {
    const { email, password } = req.body;
    const tenantId = req.tenant!.id;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Find client user
    const clientUser = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!clientUser || clientUser.status !== "active") {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Verify password
    const bcrypt = require("bcryptjs");
    const isValidPassword = await bcrypt.compare(password, clientUser.password);

    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Generate JWT
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        userId: clientUser.id,
        clientId: clientUser.clientId,
        tenantId: clientUser.tenantId,
        type: "portal",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        name: clientUser.name,
        clientName: clientUser.client.name,
      },
    });
  })
);

/**
 * Request magic link for client portal access
 * POST /t/:slug/portal/auth/request-link
 */
router.post(
  "/request-link",
  routeHandler(async (req: TenantRequest, res: Response) => {
    const { email } = req.body;
    const tenantId = req.tenant!.id;
    const tenantSlug = req.tenant!.slug;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Check if client user exists
    const clientUser = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
    });

    // Always return success even if user doesn't exist (security best practice)
    // This prevents email enumeration attacks
    if (!clientUser) {
      res.json({
        success: true,
        message: "If a portal account exists for this email, a login link has been sent.",
      });
      return;
    }

    if (clientUser.status !== "active") {
      res.json({
        success: true,
        message: "If a portal account exists for this email, a login link has been sent.",
      });
      return;
    }

    // Generate magic link token
    const token = await generatePortalAuthToken(email.toLowerCase(), tenantId);

    // Construct base URL
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    // Send magic link email
    await sendMagicLinkEmail(email, tenantSlug, token, baseUrl);

    res.json({
      success: true,
      message: "If a portal account exists for this email, a login link has been sent.",
    });
  })
);

/**
 * Verify magic link token and get JWT
 * POST /t/:slug/portal/auth/verify
 */
router.post(
  "/verify",
  routeHandler(async (req: TenantRequest, res: Response) => {
    const { token } = req.body;
    const tenantId = req.tenant!.id;

    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const result = await verifyPortalAuthToken(token, tenantId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      token: result.jwt,
    });
  })
);

export default router;
