import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create Invoice
router.post("/", asyncHandler(async (req, res) => {
  const { clientId, amount, status } = req.body;
  // Get userId from authentication token
  const userId = req.user.userId;
  
  console.log("Creating invoice with:", { clientId, userId, amount, status });
  
  const invoice = await prisma.invoice.create({ 
    data: { 
      amount: parseFloat(amount),
      status,
      client: {
        connect: { id: clientId }
      },
      user: {
        connect: { id: userId }
      }
    },
    include: {
      client: true
    }
  });
  
  res.status(201).json(invoice);
}));

// Get all Invoices
router.get("/", asyncHandler(async (req, res) => {
  // Get userId from authentication token
  const userId = req.user.userId;
  
  const invoices = await prisma.invoice.findMany({ 
    where: {
      userId: userId
    },
    include: { 
      client: true, 
      payments: true 
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  res.json(invoices);
}));

// Get Invoice by ID
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  const invoice = await prisma.invoice.findFirst({
    where: { 
      id,
      userId // Ensure user can only access their own invoices
    },
    include: {
      client: true,
      payments: true
    }
  });
  
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  res.json(invoice);
}));

// Update Invoice
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, status, clientId } = req.body;
  const userId = req.user.userId;
  
  // First check if invoice belongs to user
  const existingInvoice = await prisma.invoice.findFirst({
    where: { 
      id,
      userId
    }
  });
  
  if (!existingInvoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  const updateData: any = {};
  
  if (amount !== undefined) {
    updateData.amount = parseFloat(amount);
  }
  
  if (status) {
    updateData.status = status;
  }
  
  if (clientId) {
    updateData.client = {
      connect: { id: clientId }
    };
  }
  
  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      client: true
    }
  });
  
  res.json(invoice);
}));

// Delete Invoice
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  // First check if invoice belongs to user
  const existingInvoice = await prisma.invoice.findFirst({
    where: { 
      id,
      userId
    }
  });
  
  if (!existingInvoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  // Check if invoice has payments
  const invoiceWithPayments = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true }
  });
  
  if (invoiceWithPayments?.payments.length) {
    // Delete associated payments first
    await prisma.payment.deleteMany({
      where: { invoiceId: id }
    });
  }
  
  await prisma.invoice.delete({
    where: { id }
  });
  
  res.json({ message: "Invoice deleted successfully" });
}));

export default router;