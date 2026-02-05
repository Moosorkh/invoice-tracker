import express from "express";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireOperator, requireManager } from "../middleware/rbacMiddleware";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import { createPaymentSchema } from "../validators/paymentValidator";

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// Create Payment
router.post(
  "/",
  requireOperator,
  asyncHandler(async (req, res) => {
    const validatedData = createPaymentSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Handle Invoice Payment
    if (validatedData.invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: validatedData.invoiceId,
          tenantId,
        },
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const existingPayments = await prisma.payment.findMany({
        where: { invoiceId: validatedData.invoiceId },
      });

      const totalPaid = existingPayments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0)
      );
      const remainingBalance = new Prisma.Decimal(invoice.amount).sub(totalPaid);

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

      const newTotalPaid = totalPaid.add(validatedData.amount);
      if (newTotalPaid.gte(invoice.amount) && invoice.status !== "paid") {
        await prisma.invoice.update({
          where: { id: validatedData.invoiceId },
          data: { status: "paid" },
        });
      }

      return res.status(201).json(payment);
    }

    // Handle Loan Payment
    if (validatedData.loanId) {
      const loan = await prisma.loan.findFirst({
        where: {
          id: validatedData.loanId,
          tenantId,
        },
        include: {
          schedule: {
            where: { status: { in: ["pending", "partial", "overdue"] } },
            orderBy: { dueDate: "asc" },
          },
        },
      });

      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      // Apply payment to schedule in order
      let remainingAmount = new Prisma.Decimal(validatedData.amount);
      const scheduleUpdates: Array<{ id: string; paidPrincipal: Prisma.Decimal; paidInterest: Prisma.Decimal; status: string }> = [];

      for (const scheduleItem of loan.schedule) {
        if (remainingAmount.lte(0)) break;

        const unpaidInterest = new Prisma.Decimal(scheduleItem.interestDue).sub(scheduleItem.paidInterest);
        const unpaidPrincipal = new Prisma.Decimal(scheduleItem.principalDue).sub(scheduleItem.paidPrincipal);
        const totalUnpaid = unpaidInterest.add(unpaidPrincipal);

        if (totalUnpaid.lte(0)) continue;

        // Pay interest first, then principal
        let paidInterest = new Prisma.Decimal(scheduleItem.paidInterest);
        let paidPrincipal = new Prisma.Decimal(scheduleItem.paidPrincipal);

        if (unpaidInterest.gt(0)) {
          const interestPayment = Prisma.Decimal.min(remainingAmount, unpaidInterest);
          paidInterest = paidInterest.add(interestPayment);
          remainingAmount = remainingAmount.sub(interestPayment);
        }

        if (remainingAmount.gt(0) && unpaidPrincipal.gt(0)) {
          const principalPayment = Prisma.Decimal.min(remainingAmount, unpaidPrincipal);
          paidPrincipal = paidPrincipal.add(principalPayment);
          remainingAmount = remainingAmount.sub(principalPayment);
        }

        const newStatus = 
          paidInterest.gte(scheduleItem.interestDue) && paidPrincipal.gte(scheduleItem.principalDue)
            ? "paid"
            : "partial";

        scheduleUpdates.push({
          id: scheduleItem.id,
          paidPrincipal,
          paidInterest,
          status: newStatus,
        });
      }

      // Save payment and update schedule in transaction
      const payment = await prisma.$transaction(async (tx) => {
        const newPayment = await tx.payment.create({
          data: {
            amount: validatedData.amount,
            method: validatedData.method,
            notes: validatedData.notes,
            loan: { connect: { id: validatedData.loanId } },
          },
        });

        for (const update of scheduleUpdates) {
          await tx.loanPaymentSchedule.update({
            where: { id: update.id },
            data: {
              paidPrincipal: update.paidPrincipal,
              paidInterest: update.paidInterest,
              status: update.status,
            },
          });
        }

        // Update loan totalPaid
        const newTotalPaid = new Prisma.Decimal(loan.totalPaid).add(validatedData.amount);
        await tx.loan.update({
          where: { id: validatedData.loanId },
          data: { totalPaid: newTotalPaid },
        });

        return newPayment;
      });

      return res.status(201).json(payment);
    }

    return res.status(400).json({ error: "Payment must be for invoice or loan" });
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
  requireManager,
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

    if (!payment.invoice) {
      return res.status(400).json({ error: "Payment is not associated with an invoice" });
    }

    if (payment.invoice.tenantId !== tenantId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete payment and update invoice in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({
        where: { id },
      });

      // Update invoice status if needed
      const remainingPayments = await tx.payment.findMany({
        where: { invoiceId: payment.invoiceId! },
      });

      const totalRemaining = remainingPayments.reduce(
        (sum, p) => sum.add(p.amount),
        new Prisma.Decimal(0)
      );

      if (
        payment.invoice &&
        totalRemaining.lt(payment.invoice.amount) &&
        payment.invoice.status === "paid"
      ) {
        await tx.invoice.update({
          where: { id: payment.invoiceId! },
          data: { status: "pending" },
        });
      }
    });

    res.json({ message: "Payment deleted successfully" });
  })
);

export default router;
