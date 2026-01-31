import express from "express";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { checkLoanLimit } from "../middleware/usageLimits";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import { createLoanSchema, updateLoanSchema } from "../validators/loanValidator";

const router = express.Router();

router.use(authMiddleware);

// Helper: Generate loan number
async function generateLoanNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.loan.count({ where: { tenantId } });
  return `LOAN-${year}-${String(count + 1).padStart(5, "0")}`;
}

// Helper: Calculate amortization schedule
function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date,
  frequency: string = "monthly"
): Array<{
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
}> {
  const schedule: Array<{
    dueDate: Date;
    principalDue: number;
    interestDue: number;
    totalDue: number;
  }> = [];

  // Monthly rate
  const monthlyRate = annualRate / 100 / 12;
  
  // Monthly payment using amortization formula
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  let remainingPrincipal = principal;

  for (let i = 1; i <= termMonths; i++) {
    const interestDue = remainingPrincipal * monthlyRate;
    const principalDue = monthlyPayment - interestDue;

    // Adjust last payment for rounding
    const adjustedPrincipalDue = i === termMonths ? remainingPrincipal : principalDue;
    const adjustedTotalDue = adjustedPrincipalDue + interestDue;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      dueDate,
      principalDue: Math.round(adjustedPrincipalDue * 100) / 100,
      interestDue: Math.round(interestDue * 100) / 100,
      totalDue: Math.round(adjustedTotalDue * 100) / 100,
    });

    remainingPrincipal -= principalDue;
  }

  return schedule;
}

// Create Loan
router.post(
  "/",
  checkLoanLimit,
  asyncHandler(async (req, res) => {
    const validatedData = createLoanSchema.parse(req.body);
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id: validatedData.clientId, tenantId },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const loanNumber = await generateLoanNumber(tenantId);
    const startDate = new Date(validatedData.startDate);
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + validatedData.termMonths);

    // Generate amortization schedule
    const schedule = calculateAmortizationSchedule(
      validatedData.principal,
      validatedData.interestRate,
      validatedData.termMonths,
      startDate,
      validatedData.paymentFrequency
    );

    // Create loan with schedule in transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          loanNumber,
          productCategory: validatedData.productCategory,
          accrualMethod: validatedData.accrualMethod,
          paymentStructure: validatedData.paymentStructure,
          dayCountConvention: validatedData.dayCountConvention,
          principal: validatedData.principal,
          interestRate: validatedData.interestRate,
          rateType: validatedData.rateType,
          termMonths: validatedData.termMonths,
          paymentFrequency: validatedData.paymentFrequency,
          amortizationType: validatedData.amortizationType,
          interestOnlyMonths: validatedData.interestOnlyMonths,
          balloonAmount: validatedData.balloonAmount,
          status: "active",
          startDate,
          firstDueDate: schedule[0]?.dueDate || startDate,
          maturityDate,
          nextDueDate: schedule[0]?.dueDate,
          currentPrincipal: validatedData.principal,
          graceDays: validatedData.graceDays,
          lateFeeAmount: validatedData.lateFeeAmount,
          lateFeePercent: validatedData.lateFeePercent,
          description: validatedData.description,
          internalNotes: validatedData.internalNotes,
          activatedAt: new Date(),
          tenant: { connect: { id: tenantId } },
          client: { connect: { id: validatedData.clientId } },
          user: { connect: { id: userId } },
        },
      });

      // Create initial ledger event (disbursement)
      await tx.loanEvent.create({
        data: {
          loanId: newLoan.id,
          type: "disbursement",
          principalAmount: validatedData.principal,
          principalBalance: validatedData.principal,
          interestBalance: 0,
          feeBalance: 0,
          effectiveDate: startDate,
          description: "Initial loan disbursement",
          createdBy: userId,
        },
      });

      // Create schedule rows
      await tx.loanPaymentSchedule.createMany({
        data: schedule.map((item) => ({
          loanId: newLoan.id,
          dueDate: item.dueDate,
          principalDue: item.principalDue,
          interestDue: item.interestDue,
          totalDue: item.totalDue,
        })),
      });

      return newLoan;
    });

    const loanWithSchedule = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: {
        client: true,
        schedule: { orderBy: { dueDate: "asc" } },
      },
    });

    res.status(201).json(loanWithSchedule);
  })
);

// Get all Loans
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { status, clientId, limit, offset } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const where: any = { tenantId };

    if (status && typeof status === "string") {
      where.status = status;
    }

    if (clientId && typeof clientId === "string") {
      where.clientId = clientId;
    }

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = offset ? parseInt(offset as string) : undefined;

    const loans = await prisma.loan.findMany({
      where,
      include: {
        client: true,
        _count: {
          select: { schedule: true, payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    const total = await prisma.loan.count({ where });

    res.json({ data: loans, total });
  })
);

// Get Loan by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const loan = await prisma.loan.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        schedule: { orderBy: { dueDate: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
        events: { 
          orderBy: { createdAt: "desc" },
          take: 50 
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    res.json(loan);
  })
);

// Update Loan
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateLoanSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const existingLoan = await prisma.loan.findFirst({
      where: { id, tenantId },
    });

    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const updateData: any = {};

    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.nextDueDate) updateData.nextDueDate = new Date(validatedData.nextDueDate);
    if (validatedData.description !== undefined) updateData.description = validatedData.description;

    const loan = await prisma.loan.update({
      where: { 
        id,
        tenantId 
      },
      data: updateData,
      include: { client: true },
    });

    res.json(loan);
  })
);

// Delete Loan
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    const existingLoan = await prisma.loan.findFirst({
      where: { id, tenantId },
    });

    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    await prisma.loan.delete({ 
      where: { 
        id,
        tenantId 
      } 
    });

    res.json({ message: "Loan deleted successfully" });
  })
);

// Post payment to loan
router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { amount, method, effectiveDate, notes } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Payment amount must be positive" });
    }

    const loan = await prisma.loan.findFirst({
      where: { id, tenantId },
      include: { schedule: { orderBy: { dueDate: 'asc' } } },
    });

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Payment allocation waterfall: Fees → Interest → Principal
    const result = await prisma.$transaction(async (tx) => {
      let remainingAmount = amount;
      const allocations: any = {
        fees: 0,
        interest: 0,
        principal: 0,
      };

      // Allocate to fees first
      if (parseFloat(loan.currentFees.toString()) > 0) {
        const feePayment = Math.min(remainingAmount, parseFloat(loan.currentFees.toString()));
        allocations.fees = feePayment;
        remainingAmount -= feePayment;
      }

      // Then interest
      if (remainingAmount > 0 && parseFloat(loan.currentInterest.toString()) > 0) {
        const interestPayment = Math.min(remainingAmount, parseFloat(loan.currentInterest.toString()));
        allocations.interest = interestPayment;
        remainingAmount -= interestPayment;
      }

      // Finally principal
      if (remainingAmount > 0 && parseFloat(loan.currentPrincipal.toString()) > 0) {
        const principalPayment = Math.min(remainingAmount, parseFloat(loan.currentPrincipal.toString()));
        allocations.principal = principalPayment;
        remainingAmount -= principalPayment;
      }

      // Update loan balances
      const newFees = parseFloat(loan.currentFees.toString()) - allocations.fees;
      const newInterest = parseFloat(loan.currentInterest.toString()) - allocations.interest;
      const newPrincipal = parseFloat(loan.currentPrincipal.toString()) - allocations.principal;
      const newTotalPaid = parseFloat(loan.totalPaid.toString()) + amount;

      await tx.loan.update({
        where: { id },
        data: {
          currentFees: newFees,
          currentInterest: newInterest,
          currentPrincipal: newPrincipal,
          totalPaid: newTotalPaid,
          substatus: newPrincipal === 0 ? 'paid_off' : loan.substatus,
          status: newPrincipal === 0 ? 'paid_off' : loan.status,
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          loanId: id,
          amount,
          method: method || 'manual',
          notes,
        },
      });

      // Create ledger event
      await tx.loanEvent.create({
        data: {
          loanId: id,
          type: 'payment_posted',
          principalAmount: allocations.principal ? -allocations.principal : null,
          interestAmount: allocations.interest ? -allocations.interest : null,
          feeAmount: allocations.fees ? -allocations.fees : null,
          principalBalance: newPrincipal,
          interestBalance: newInterest,
          feeBalance: newFees,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          description: `Payment: $${amount.toFixed(2)} (Fees: $${allocations.fees.toFixed(2)}, Interest: $${allocations.interest.toFixed(2)}, Principal: $${allocations.principal.toFixed(2)})`,
          metadata: { allocations, overpayment: remainingAmount },
          createdBy: userId,
        },
      });

      return { payment, allocations, overpayment: remainingAmount };
    });

    res.json(result);
  })
);

export default router;
