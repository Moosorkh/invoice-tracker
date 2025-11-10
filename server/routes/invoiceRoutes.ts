import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
} from "../validators/invoiceValidator";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper function to generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

// Create Invoice
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const validatedData = createInvoiceSchema.parse(req.body);
    const userId = req.user.userId;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        amount: validatedData.amount,
        status: validatedData.status,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        description: validatedData.description,
        client: {
          connect: { id: validatedData.clientId },
        },
        user: {
          connect: { id: userId },
        },
      },
      include: {
        client: true,
      },
    });

    res.status(201).json(invoice);
  })
);

// Get all Invoices
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { status, search, limit, offset } = req.query;

    // Build where clause
    const where: any = { userId };

    // Filter by status
    if (status && typeof status === "string") {
      where.status = status;
    }

    // Search by invoice number or client name
    if (search && typeof search === "string") {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Parse pagination
    const take = limit ? parseInt(limit as string) : undefined;
    const skip = offset ? parseInt(offset as string) : undefined;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    });

    // Check for overdue invoices and update status
    const now = new Date();
    for (const invoice of invoices) {
      if (
        invoice.status === "pending" &&
        invoice.dueDate &&
        invoice.dueDate < now
      ) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "overdue" },
        });
        invoice.status = "overdue";
      }
    }

    // Get total count for pagination
    const total = await prisma.invoice.count({ where });

    res.json({ data: invoices, total });
  })
);

// Get Invoice by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId, // Ensure user can only access their own invoices
      },
      include: {
        client: true,
        payments: true,
        items: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  })
);

// Update Invoice
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateInvoiceSchema.parse(req.body);
    const userId = req.user.userId;

    // First check if invoice belongs to user and get payments
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        payments: true,
      },
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updateData: any = {};

    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount;

      // Recalculate status based on total payments vs new amount
      const totalPaid = existingInvoice.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      if (totalPaid >= validatedData.amount) {
        // Fully paid (or overpaid)
        updateData.status = "paid";
      } else if (
        existingInvoice.dueDate &&
        existingInvoice.dueDate < new Date()
      ) {
        // Partially paid but overdue
        updateData.status = "overdue";
      } else {
        // Partially paid or unpaid, not overdue
        updateData.status = "pending";
      }
    }

    if (validatedData.status) {
      // Allow manual status override only if not changing amount
      if (validatedData.amount === undefined) {
        updateData.status = validatedData.status;
      }
    }

    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    if (validatedData.clientId) {
      updateData.client = {
        connect: { id: validatedData.clientId },
      };
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });

    res.json(invoice);
  })
);

// Delete Invoice
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // First check if invoice belongs to user
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // With cascade delete, payments will be automatically deleted
    await prisma.invoice.delete({
      where: { id },
    });

    res.json({ message: "Invoice deleted successfully" });
  })
);

export default router;
