import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { checkInvoiceLimit } from "../middleware/usageLimits";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
} from "../validators/invoiceValidator";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper function to generate next available invoice number
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: {
      tenantId,
      invoiceNumber: { startsWith: prefix },
    },
    select: { invoiceNumber: true },
    orderBy: { invoiceNumber: "desc" },
  });

  const last = latest?.invoiceNumber?.match(/INV-\d{4}-(\d{5})/)?.[1];
  const next = last ? parseInt(last, 10) + 1 : 1;

  return `${prefix}${String(next).padStart(5, "0")}`;
}

// Create Invoice
router.post(
  "/",
  checkInvoiceLimit,
  asyncHandler(async (req, res) => {
    const validatedData = createInvoiceSchema.parse(req.body);
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify client belongs to same tenant
    const client = await prisma.client.findFirst({
      where: { id: validatedData.clientId, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found or does not belong to your organization" });
    }

    // Retry logic for invoice number generation (handles race conditions)
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const invoiceNumber = await generateInvoiceNumber(tenantId);

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
            tenant: {
              connect: { id: tenantId },
            },
          },
          include: {
            client: true,
          },
        });

        return res.status(201).json(invoice);
      } catch (error: any) {
        if (error?.code === "P2002" && attempt < maxAttempts) {
          const delay = 50 + Math.random() * 100;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (error?.code === "P2002") {
          return res.status(409).json({ error: "Invoice number already exists. Please retry." });
        }

        throw error;
      }
    }
  })
);

// Get all Invoices
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { status, search, limit, offset } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Build where clause
    const where: any = { tenantId };

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
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId, // Ensure user can only access their tenant's invoices
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
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // First check if invoice belongs to tenant and get payments
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
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
        (sum, payment) => sum.add(payment.amount),
        new (prisma as any).Prisma.Decimal(0)
      );

      if (totalPaid.gte(validatedData.amount)) {
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
      // Verify client belongs to same tenant
      const client = await prisma.client.findFirst({
        where: { id: validatedData.clientId, tenantId },
      });

      if (!client) {
        return res.status(404).json({ error: "Client not found or does not belong to your organization" });
      }

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
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // First check if invoice belongs to tenant
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
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
