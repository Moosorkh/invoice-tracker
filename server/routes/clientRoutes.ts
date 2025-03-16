import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create Client
router.post("/", asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const client = await prisma.client.create({ data: { name, email } });
  res.status(201).json(client);
}));

// Get all Clients
router.get("/", asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { 
      updatedAt: 'desc' 
    }
  });
  res.json(clients);
}));

// Get Client by ID
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { invoices: true }
  });
  
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }
  
  res.json(client);
}));

// Update Client
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  
  const client = await prisma.client.update({
    where: { id },
    data: { name, email }
  });
  
  res.json(client);
}));

// Delete Client
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // First check if client has any invoices
  const clientWithInvoices = await prisma.client.findUnique({
    where: { id },
    include: { invoices: true }
  });
  
  if (clientWithInvoices?.invoices.length) {
    return res.status(400).json({ 
      error: "Cannot delete client with existing invoices" 
    });
  }
  
  await prisma.client.delete({
    where: { id }
  });
  
  res.json({ message: "Client deleted successfully" });
}));

export default router;