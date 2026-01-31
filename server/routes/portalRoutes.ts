import { Router, Response } from "express";
import { Request } from "express";
import { clientPortalAuthMiddleware } from "../middleware/clientPortalAuth";
import { routeHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";

const router = Router();

// Apply client portal auth middleware to all routes
router.use(clientPortalAuthMiddleware);

/**
 * Get client portal dashboard data
 * GET /t/:slug/portal/api/dashboard
 */
router.get(
  "/dashboard",
  routeHandler(async (req: Request, res: Response) => {
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mailingAddress: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    // Get loans summary
    const loans = await prisma.loan.findMany({
      where: {
        tenantId,
        clientId,
      },
      select: {
        id: true,
        loanNumber: true,
        principal: true,
        interestRate: true,
        status: true,
        startDate: true,
        maturityDate: true,
        nextDueDate: true,
        totalPaid: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get invoices summary
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        clientId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({
      client,
      loans,
      invoices,
    });
  })
);

/**
 * Get specific loan details with payment schedule
 * GET /t/:slug/portal/api/loans/:loanId
 */
router.get(
  "/loans/:loanId",
  routeHandler(async (req: Request, res: Response) => {
    const { loanId } = req.params;
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;

    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        tenantId,
        clientId, // Ensure client can only access their own loans
      },
      include: {
        schedule: {
          orderBy: { dueDate: "asc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    res.json(loan);
  })
);

/**
 * Get specific invoice details
 * GET /t/:slug/portal/api/invoices/:invoiceId
 */
router.get(
  "/invoices/:invoiceId",
  routeHandler(async (req: Request, res: Response) => {
    const { invoiceId } = req.params;
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
        clientId, // Ensure client can only access their own invoices
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json(invoice);
  })
);

/**
 * Get client portal user profile
 * GET /t/:slug/portal/api/profile
 */
router.get(
  "/profile",
  routeHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId!;
    const tenantId = req.user!.tenantId!;

    const clientUser = await prisma.clientUser.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
            mailingAddress: true,
            physicalAddress: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
          },
        },
      },
    });

    if (!clientUser) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(clientUser);
  })
);

/**
 * Update client profile
 * PUT /t/:slug/portal/api/profile
 */
router.put(
  "/profile",
  routeHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId!;
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;
    const { phone, mailingAddress, physicalAddress, city, state, zipCode } = req.body;

    // Update client info (not clientUser, since that's just the portal account)
    const updatedClient = await prisma.client.update({
      where: { 
        id: clientId,
        tenantId 
      },
      data: {
        phone,
        mailingAddress,
        physicalAddress,
        city,
        state,
        zipCode,
      },
    });

    res.json(updatedClient);
  })
);

/**
 * Get payment history for a specific loan
 * GET /t/:slug/portal/api/loans/:loanId/payments
 */
router.get(
  "/loans/:loanId/payments",
  routeHandler(async (req: Request, res: Response) => {
    const { loanId } = req.params;
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;

    // Verify loan belongs to client
    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        tenantId,
        clientId,
      },
    });

    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    // Get payment history with allocation details
    const payments = await prisma.payment.findMany({
      where: { loanId },
      orderBy: { createdAt: "desc" },
    });

    // Get loan events for detailed ledger view
    const events = await prisma.loanEvent.findMany({
      where: {
        loanId,
        type: { in: ["payment_posted", "disbursement", "fee_assessed"] },
      },
      orderBy: { effectiveDate: "desc" },
      take: 50,
    });

    res.json({ payments, events });
  })
);

/**
 * Get payment schedule for a loan
 * GET /t/:slug/portal/api/loans/:loanId/schedule
 */
router.get(
  "/loans/:loanId/schedule",
  routeHandler(async (req: Request, res: Response) => {
    const { loanId } = req.params;
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;

    // Verify loan belongs to client
    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        tenantId,
        clientId,
      },
    });

    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const schedule = await prisma.loanPaymentSchedule.findMany({
      where: { loanId },
      orderBy: { dueDate: "asc" },
    });

    res.json(schedule);
  })
);

/**
 * Request payoff quote
 * POST /t/:slug/portal/api/loans/:loanId/payoff-quote
 */
router.post(
  "/loans/:loanId/payoff-quote",
  routeHandler(async (req: Request, res: Response) => {
    const { loanId } = req.params;
    const { effectiveDate } = req.body;
    const clientId = req.user!.clientId!;
    const tenantId = req.user!.tenantId!;

    // Verify loan belongs to client
    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        tenantId,
        clientId,
      },
    });

    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const quoteDate = effectiveDate ? new Date(effectiveDate) : new Date();
    const goodThroughDate = new Date(quoteDate);
    goodThroughDate.setDate(goodThroughDate.getDate() + 10);

    // Calculate payoff amount (simplified - would need proper per-diem calculation)
    const payoffAmount = parseFloat(loan.currentPrincipal.toString()) +
                         parseFloat(loan.currentInterest.toString()) +
                         parseFloat(loan.currentFees.toString());

    res.json({
      loanNumber: loan.loanNumber,
      quoteDate: quoteDate.toISOString(),
      goodThroughDate: goodThroughDate.toISOString(),
      currentPrincipal: loan.currentPrincipal,
      currentInterest: loan.currentInterest,
      currentFees: loan.currentFees,
      payoffAmount: payoffAmount.toFixed(2),
      perDiemInterest: ((parseFloat(loan.principal.toString()) * parseFloat(loan.interestRate.toString()) / 100) / 365).toFixed(2),
      message: "This is an estimated payoff quote. Please contact us for an official payoff letter.",
    });
  })
);

export default router;
