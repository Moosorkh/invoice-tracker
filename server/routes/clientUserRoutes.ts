import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import { generatePortalAuthToken } from "../utils/portalAuth";

const router = Router();

// Get portal users for a client
router.get("/client/:clientId/portal-users", authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const tenantId = req.user!.tenantId;

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const portalUsers = await prisma.clientUser.findMany({
      where: { clientId, tenantId },
      select: { id: true, email: true, createdAt: true },
    });

    res.json({ data: portalUsers });
  } catch (error) {
    console.error("Error fetching portal users:", error);
    res.status(500).json({ error: "Failed to fetch portal users" });
  }
});

// Create portal user for a client
router.post("/client/:clientId/portal-user", authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { email } = req.body;
    const tenantId = req.user!.tenantId;

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    // Check if portal user already exists
    const existing = await prisma.clientUser.findUnique({
      where: {
        tenantId_email: { tenantId, email },
      },
    });

    if (existing) {
      res.status(400).json({ error: "Portal user already exists with this email" });
      return;
    }

    // Create portal user
    const portalUser = await prisma.clientUser.create({
      data: {
        email,
        clientId,
        tenantId,
      },
    });

    // Generate magic link token
    const token = await generatePortalAuthToken(email, tenantId);
    
    // TODO: Send email with magic link
    // For now, return the token in response
    console.log(`Portal user created. Magic link token: ${token}`);

    res.status(201).json({ 
      data: portalUser,
      message: "Portal user created successfully",
      // In production, remove this and send via email
      magicLinkToken: token
    });
  } catch (error) {
    console.error("Error creating portal user:", error);
    res.status(500).json({ error: "Failed to create portal user" });
  }
});

// Delete portal user
router.delete("/client/:clientId/portal-user/:portalUserId", authMiddleware, async (req, res) => {
  try {
    const { clientId, portalUserId } = req.params;
    const tenantId = req.user!.tenantId;

    // Verify portal user exists and belongs to tenant
    const portalUser = await prisma.clientUser.findFirst({
      where: {
        id: portalUserId,
        clientId,
        tenantId,
      },
    });

    if (!portalUser) {
      res.status(404).json({ error: "Portal user not found" });
      return;
    }

    await prisma.clientUser.delete({
      where: { id: portalUserId },
    });

    res.json({ message: "Portal user deleted successfully" });
  } catch (error) {
    console.error("Error deleting portal user:", error);
    res.status(500).json({ error: "Failed to delete portal user" });
  }
});

export default router;
