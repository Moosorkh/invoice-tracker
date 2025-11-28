import express from "express";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import { createPaymentSchema } from "../validators/paymentValidator";

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// Create Payment
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const validatedData = createPaymentSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify that the invoice belongs to the tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: validatedData.invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Calculate total payments already made
    const existingPayments = await prisma.payment.findMany({
      where: { invoiceId: validatedData.invoiceId },
    });

    const totalPaid = existingPayments.reduce(
      (sum, payment) => sum.add(payment.amount),
      new Prisma.Decimal(0)
    );
    const remainingBalance = new Prisma.Decimal(invoice.amount).sub(totalPaid);

    // Ensure payment amount doesn't exceed remaining balance
    if (new Prisma.Decimal(validatedData.amount).gt(remainingBalance)) {
      return res.status(400).json({
        error: "Payment amount exceeds remaining balance",
        remainingBalance: remainingBalance.toNumber(),
      });
    }

    const payment = await prisma.payment.create({
      data: {
        amount: validatedData.amount,
        method: validatedData.method,
        notes: validatedData.notes,
        invoice: {
          connect: { id: validatedData.invoiceId },
        },
      },
    });

    // Check if invoice is fully paid and update status if needed
    const newTotalPaid = totalPaid.add(validatedData.amount);
    if (newTotalPaid.gte(invoice.amount) && invoice.status !== "paid") {
      await prisma.invoice.update({
        where: { id: validatedData.invoiceId },
        data: { status: "paid" },
      });
    }

    res.status(201).json(payment);
  })
);

// Get all payments for a specific invoice
router.get(
  "/invoice/:invoiceId",
  asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });

    res.json(payments);
  })
);

// Get all payments
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Get all tenant's invoices
    const tenantInvoices = await prisma.invoice.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const invoiceIds = tenantInvoices.map((invoice) => invoice.id);

    // Get payments for those invoices
    const payments = await prisma.payment.findMany({
      where: {
        invoiceId: {
          in: invoiceIds,
        },
      },
      include: {
        invoice: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(payments);
  })
);

// Delete Payment
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Find payment and check if it belongs to tenant's invoice
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.invoice.tenantId !== tenantId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.payment.delete({
      where: { id },
    });

    // Update invoice status if needed
    const remainingPayments = await prisma.payment.findMany({
      where: { invoiceId: payment.invoiceId },
    });

    const totalRemaining = remainingPayments.reduce(
      (sum, p) => sum.add(p.amount),
      new Prisma.Decimal(0)
    );

    if (
      totalRemaining.lt(payment.invoice.amount) &&
      payment.invoice.status === "paid"
    ) {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: "pending" },
      });
    }

    res.json({ message: "Payment deleted successfully" });
  })
);

export default router;
