import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
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
  asyncHandler(async (req, res) => {
    const validatedData = createClientSchema.parse(req.body);
    const client = await prisma.client.create({ data: validatedData });
    res.status(201).json(client);
  })
);

// Get all Clients
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, limit, offset } = req.query;

    // Build where clause
    const where: any = {};

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
    const client = await prisma.client.findUnique({
      where: { id },
      include: { invoices: true },
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

    const client = await prisma.client.update({
      where: { id },
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

    // With cascade delete, we can now safely delete clients with invoices
    await prisma.client.delete({
      where: { id },
    });

    res.json({ message: "Client deleted successfully" });
  })
);

export default router;
