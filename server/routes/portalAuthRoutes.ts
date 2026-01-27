import { Router, Response } from "express";
import { TenantRequest } from "../middleware/tenantResolver";
import { routeHandler } from "../utils/routeHandler";
import {
  generatePortalAuthToken,
  verifyPortalAuthToken,
} from "../utils/portalAuth";
import { sendMagicLinkEmail, sendPasswordResetEmail } from "../utils/emailService";
import { prisma } from "../utils/prisma";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter for login attempts (5 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for magic link/password reset requests (3 requests per 15 minutes per IP)
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password-based login for client portal
 * POST /t/:slug/portal/auth/login
 */
router.post(
  "/login",
  loginLimiter,
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
    const userPassword = (clientUser as any).password;
    
    if (!userPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    
    const isValidPassword = await bcrypt.compare(password, userPassword);

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
        userType: "client",
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
  emailLimiter,
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

    // Send magic link email
    await sendMagicLinkEmail(email, tenantSlug, token);

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

/**
 * Set password using invite or reset token
 * POST /t/:slug/portal/auth/set-password
 */
router.post(
  "/set-password",
  routeHandler(async (req: TenantRequest, res: Response) => {
    const { token, password } = req.body;
    const tenantId = req.tenant!.id;

    if (!token || !password) {
      res.status(400).json({ error: "Token and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    // Validate token
    const { validatePortalToken, markTokenAsUsed } = require("../utils/portalTokens");
    const validation = await validatePortalToken(token, "invite") || await validatePortalToken(token, "reset");

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const authToken = validation.authToken;

    // Verify token belongs to this tenant
    if (authToken.tenantId !== tenantId) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    // Find or verify portal user
    let portalUser;
    if (authToken.portalUserId) {
      // Reset token - user already exists
      portalUser = await prisma.clientUser.findUnique({
        where: { id: authToken.portalUserId },
      });
    } else {
      // Invite token - find user by email
      portalUser = await prisma.clientUser.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: authToken.email,
          },
        },
      });
    }

    if (!portalUser) {
      res.status(404).json({ error: "Portal user not found" });
      return;
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and activate account
    await prisma.clientUser.update({
      where: { id: portalUser.id },
      data: {
        password: hashedPassword,
        status: "active",
      },
    });

    // Mark token as used
    await markTokenAsUsed(token);

    res.json({
      success: true,
      message: "Password set successfully. You can now log in.",
    });
  })
);

/**
 * Request password reset (borrower self-service)
 * POST /t/:slug/portal/auth/forgot-password
 */
router.post(
  "/forgot-password",
  emailLimiter,
  routeHandler(async (req: TenantRequest, res: Response) => {
    const { email } = req.body;
    const tenantId = req.tenant!.id;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Find portal user
    const portalUser = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
    });

    // Always return success to avoid email enumeration
    // But only send email if user exists
    if (portalUser) {
      const { generatePortalToken } = require("../utils/portalTokens");
      const { token } = await generatePortalToken(
        tenantId,
        email,
        "reset",
        portalUser.id
      );

      // Get tenant slug for URL
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      });

      if (tenant?.slug) {
        await sendPasswordResetEmail(email, tenant.slug, token);
      }
    }

    res.json({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  })
);

export default router;
