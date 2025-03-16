import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware
router.use(authMiddleware);

// Create Payment
router.post("/", asyncHandler(async (req, res) => {
  const { invoiceId, amount, method } = req.body;
  const userId = req.user.userId;
  
  // Verify that the invoice belongs to the user
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      userId
    }
  });
  
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  // Calculate total payments already made
  const existingPayments = await prisma.payment.findMany({
    where: { invoiceId }
  });
  
  const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = invoice.amount - totalPaid;
  
  // Ensure payment amount doesn't exceed remaining balance
  if (parseFloat(amount) > remainingBalance) {
    return res.status(400).json({ 
      error: "Payment amount exceeds remaining balance",
      remainingBalance
    });
  }
  
  const payment = await prisma.payment.create({
    data: {
      amount: parseFloat(amount),
      method,
      invoice: {
        connect: { id: invoiceId }
      }
    }
  });
  
  // Check if invoice is fully paid and update status if needed
  const newTotalPaid = totalPaid + parseFloat(amount);
  if (newTotalPaid >= invoice.amount && invoice.status !== "paid") {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "paid" }
    });
  }
  
  res.status(201).json(payment);
}));

// Get all payments for a specific invoice
router.get("/invoice/:invoiceId", asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const userId = req.user.userId;
  
  // Verify invoice belongs to user
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      userId
    }
  });
  
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "desc" }
  });
  
  res.json(payments);
}));

// Get all payments
router.get("/", asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  
  // Get all user's invoices
  const userInvoices = await prisma.invoice.findMany({
    where: { userId },
    select: { id: true }
  });
  
  const invoiceIds = userInvoices.map(invoice => invoice.id);
  
  // Get payments for those invoices
  const payments = await prisma.payment.findMany({
    where: {
      invoiceId: {
        in: invoiceIds
      }
    },
    include: {
      invoice: {
        include: {
          client: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  
  res.json(payments);
}));

// Delete Payment
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  // Find payment and check if it belongs to user's invoice
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: true
    }
  });
  
  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }
  
  if (payment.invoice.userId !== userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  
  await prisma.payment.delete({
    where: { id }
  });
  
  // Update invoice status if needed
  const remainingPayments = await prisma.payment.findMany({
    where: { invoiceId: payment.invoiceId }
  });
  
  const totalRemaining = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
  
  if (totalRemaining < payment.invoice.amount && payment.invoice.status === "paid") {
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: "pending" }
    });
  }
  
  res.json({ message: "Payment deleted successfully" });
}));

export default router;