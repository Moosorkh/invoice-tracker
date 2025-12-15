-- Add plan limit columns to Tenant table
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxClients" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxInvoices" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxLoans" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 1;

-- Create Loan table if missing (multi-tenant, per-client, per-user)
CREATE TABLE IF NOT EXISTS "Loan" (
	"id" TEXT NOT NULL,
	"loanNumber" TEXT NOT NULL,
	"tenantId" TEXT NOT NULL,
	"clientId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"principal" DECIMAL(19,4) NOT NULL,
	"interestRate" DECIMAL(5,2) NOT NULL,
	"termMonths" INTEGER NOT NULL,
	"paymentFrequency" TEXT NOT NULL DEFAULT 'monthly',
	"status" TEXT NOT NULL DEFAULT 'active',
	"startDate" TIMESTAMP(3) NOT NULL,
	"maturityDate" TIMESTAMP(3) NOT NULL,
	"nextDueDate" TIMESTAMP(3),
	"totalPaid" DECIMAL(19,4) NOT NULL DEFAULT 0,
	"description" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- Create LoanPaymentSchedule table if missing
CREATE TABLE IF NOT EXISTS "LoanPaymentSchedule" (
	"id" TEXT NOT NULL,
	"loanId" TEXT NOT NULL,
	"dueDate" TIMESTAMP(3) NOT NULL,
	"principalDue" DECIMAL(19,4) NOT NULL,
	"interestDue" DECIMAL(19,4) NOT NULL,
	"totalDue" DECIMAL(19,4) NOT NULL,
	"paidPrincipal" DECIMAL(19,4) NOT NULL DEFAULT 0,
	"paidInterest" DECIMAL(19,4) NOT NULL DEFAULT 0,
	"status" TEXT NOT NULL DEFAULT 'pending',
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "LoanPaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- Adjust Payment to support loans
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_invoiceId_fkey";
ALTER TABLE "Payment" ALTER COLUMN "invoiceId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "loanId" TEXT;

-- Re-add foreign keys
ALTER TABLE "Payment" ADD CONSTRAINT IF NOT EXISTS "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT IF NOT EXISTS "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for Loan
ALTER TABLE "Loan" ADD CONSTRAINT IF NOT EXISTS "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT IF NOT EXISTS "Loan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT IF NOT EXISTS "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for LoanPaymentSchedule
ALTER TABLE "LoanPaymentSchedule" ADD CONSTRAINT IF NOT EXISTS "LoanPaymentSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "Loan_tenantId_loanNumber_key" ON "Loan"("tenantId", "loanNumber");
CREATE INDEX IF NOT EXISTS "Loan_tenantId_idx" ON "Loan"("tenantId");
CREATE INDEX IF NOT EXISTS "Loan_clientId_idx" ON "Loan"("clientId");
CREATE INDEX IF NOT EXISTS "Loan_userId_idx" ON "Loan"("userId");
CREATE INDEX IF NOT EXISTS "Loan_status_idx" ON "Loan"("status");

CREATE INDEX IF NOT EXISTS "LoanPaymentSchedule_loanId_idx" ON "LoanPaymentSchedule"("loanId");
CREATE INDEX IF NOT EXISTS "LoanPaymentSchedule_dueDate_idx" ON "LoanPaymentSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS "LoanPaymentSchedule_status_idx" ON "LoanPaymentSchedule"("status");

-- Ensure indexes for payments
CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX IF NOT EXISTS "Payment_loanId_idx" ON "Payment"("loanId");
