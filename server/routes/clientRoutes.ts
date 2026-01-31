import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { checkClientLimit } from "../middleware/usageLimits";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import { sendPortalInviteEmail } from "../utils/emailService";
import {
  createClientSchema,
  updateClientSchema,
} from "../validators/clientValidator";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create Client
router.post(
  "/",
  checkClientLimit,
  asyncHandler(async (req, res) => {
    const validatedData = createClientSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const client = await prisma.client.create({ 
      data: {
        ...validatedData,
        tenantId,
      },
    });
    res.status(201).json(client);
  })
);

// Get all Clients
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { search, limit, offset } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Build where clause
    const where: any = { tenantId };

    // Search by name or email
    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Parse pagination
    const take = limit ? parseInt(limit as string) : undefined;
    const skip = offset ? parseInt(offset as string) : undefined;

    const clients = await prisma.client.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      take,
      skip,
    });

    // Get total count
    const total = await prisma.client.count({ where });

    res.json({ data: clients, total });
  })
);

// Get Client by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: { 
        invoices: true,
        loans: true,
        addresses: true,
        contacts: true,
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  })
);

// Update Client
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateClientSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify client belongs to tenant
    const existingClient = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!existingClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    const client = await prisma.client.update({
      where: { 
        id,
        tenantId 
      },
      data: validatedData,
    });

    res.json(client);
  })
);

// Delete Client
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify client belongs to tenant
    const existingClient = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!existingClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    // With cascade delete, we can now safely delete clients with invoices
    await prisma.client.delete({
      where: { 
        id,
        tenantId 
      },
    });

    res.json({ message: "Client deleted successfully" });
  })
);

// Add client address
router.post(
  "/:id/addresses",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const address = await prisma.clientAddress.create({
      data: {
        clientId: id,
        ...req.body,
      },
    });

    res.status(201).json(address);
  })
);

// Add client contact
router.post(
  "/:id/contacts",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId: id,
        ...req.body,
      },
    });

    res.status(201).json(contact);
  })
);

// Create portal user for client (borrower login)
router.post(
  "/:id/portal-user/invite",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, name } = req.body;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Check if portal user already exists
    const existingUser = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "A portal user with this email already exists" });
    }

    // Get tenant for portal URL
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Create portal user without password (they'll set it via invite link)
    const portalUser = await prisma.clientUser.create({
      data: {
        tenantId,
        clientId: id,
        email: email.toLowerCase(),
        password: "", // Empty password - user will set it via invite token
        name: name || client.name,
        status: "pending", // Pending until they set their password
      },
    });

    // Generate invite token
    const { generatePortalToken } = require("../utils/portalTokens");
    const { token, expiresAt } = await generatePortalToken(
      tenantId,
      email,
      "invite",
      portalUser.id
    );

    // Construct invite URL
    const inviteUrl = `${process.env.FRONTEND_URL || 'https://invoice-tracker.up.railway.app'}/portal/${tenant.slug}/set-password?token=${token}`;

    // Send invite email
    await sendPortalInviteEmail(
      email,
      tenant.slug,
      token,
      client.name
    );

    res.status(201).json({
      id: portalUser.id,
      email: portalUser.email,
      name: portalUser.name,
      status: portalUser.status,
      message: "Portal invite sent successfully. The user will receive an email with instructions to set their password.",
    });
  })
);

// Backward-compatible endpoint (old client builds still call /portal-user without /invite)
router.post(
  "/:id/portal-user",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, name } = req.body;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Check if portal user already exists
    const existingUser = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "A portal user with this email already exists" });
    }

    // Get tenant for portal URL
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Create portal user without password (they'll set it via invite link)
    const portalUser = await prisma.clientUser.create({
      data: {
        tenantId,
        clientId: id,
        email: email.toLowerCase(),
        password: "", // Empty password - user will set it via invite token
        name: name || client.name,
        status: "pending", // Pending until they set their password
      },
    });

    // Generate invite token
    const { generatePortalToken } = require("../utils/portalTokens");
    const { token, expiresAt } = await generatePortalToken(
      tenantId,
      email,
      "invite",
      portalUser.id
    );

    // Construct invite URL
    const inviteUrl = `${process.env.FRONTEND_URL || 'https://invoice-tracker.up.railway.app'}/portal/${tenant.slug}/set-password?token=${token}`;

    // Send invite email
    await sendPortalInviteEmail(
      email,
      tenant.slug,
      token,
      client.name
    );

    res.status(201).json({
      id: portalUser.id,
      email: portalUser.email,
      name: portalUser.name,
      status: portalUser.status,
      message: "Portal invite sent successfully. The user will receive an email with instructions to set their password.",
    });
  })
);

// Create portal user with direct password (admin sets password)
router.post(
  "/:id/portal-user/direct",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, password, name } = req.body;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Check if portal user already exists
    const existingUser = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.toLowerCase(),
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "A portal user with this email already exists" });
    }

    // Get tenant for portal URL
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create portal user with password
    const portalUser = await prisma.clientUser.create({
      data: {
        tenantId,
        clientId: id,
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || client.name,
        status: "active", // Active immediately since password is set
      },
    });

    // Return without password
    const { password: _, ...userWithoutPassword } = portalUser as any;

    res.status(201).json({
      ...userWithoutPassword,
      portalLoginUrl: `/portal/${tenant.slug}`,
      portalLoginUrlFull: `${process.env.FRONTEND_URL || 'https://invoice-tracker.up.railway.app'}/portal/${tenant.slug}`,
      instructions: "Share the portal login URL with your borrower. They can use their email and the password you set.",
    });
  })
);

// Get portal users for a client
router.get(
  "/:id/portal-users",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const portalUsers = await prisma.clientUser.findMany({
      where: {
        clientId: id,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(portalUsers);
  })
);

// Reset portal user password (send reset token)
router.post(
  "/:id/portal-users/:userId/reset-password",
  asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Verify portal user belongs to this client and tenant
    const portalUser = await prisma.clientUser.findFirst({
      where: {
        id: userId,
        clientId: id,
        tenantId,
      },
    });

    if (!portalUser) {
      return res.status(404).json({ error: "Portal user not found" });
    }

    // Get tenant for portal URL
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Generate reset token
    const { generatePortalToken } = require("../utils/portalTokens");
    const { token, expiresAt } = await generatePortalToken(
      tenantId,
      portalUser.email,
      "reset",
      portalUser.id
    );

    // Construct reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'https://invoice-tracker.up.railway.app'}/portal/${tenant.slug}/set-password?token=${token}`;

    // TODO: In production, send this via email
    // For now, return it in the response

    res.json({
      resetUrl,
      expiresAt,
      instructions: "Share this password reset link with your borrower. Link expires in 1 hour.",
    });
  })
);

// Direct password reset (admin sets new password)
router.post(
  "/:id/portal-users/:userId/reset-password/direct",
  asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const { password } = req.body;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Verify portal user belongs to this client and tenant
    const portalUser = await prisma.clientUser.findFirst({
      where: {
        id: userId,
        clientId: id,
        tenantId,
      },
    });

    if (!portalUser) {
      return res.status(404).json({ error: "Portal user not found" });
    }

    // Hash new password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and set status to active
    await prisma.clientUser.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        status: "active",
      },
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  })
);

// Delete portal user
router.delete(
  "/:id/portal-users/:userId",
  asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Verify portal user belongs to this client and tenant
    const portalUser = await prisma.clientUser.findFirst({
      where: {
        id: userId,
        clientId: id,
        tenantId,
      },
    });

    if (!portalUser) {
      return res.status(404).json({ error: "Portal user not found" });
    }

    // Delete the portal user
    await prisma.clientUser.delete({
      where: { id: userId },
    });

    res.json({ message: "Portal user deleted successfully" });
  })
);

export default router;
