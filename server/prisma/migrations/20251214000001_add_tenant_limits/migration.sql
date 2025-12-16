-- Step 1: Add missing tenant limit columns
DO $$ BEGIN
  ALTER TABLE "Tenant" ADD COLUMN "maxClients" INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Tenant" ADD COLUMN "maxInvoices" INTEGER NOT NULL DEFAULT 20;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Tenant" ADD COLUMN "maxLoans" INTEGER NOT NULL DEFAULT 5;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Tenant" ADD COLUMN "maxUsers" INTEGER NOT NULL DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Step 2: Create Loan table
DO $$ BEGIN
  CREATE TABLE "Loan" (
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
    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Step 3: Create LoanPaymentSchedule table
DO $$ BEGIN
  CREATE TABLE "LoanPaymentSchedule" (
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
    CONSTRAINT "LoanPaymentSchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LoanPaymentSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Step 4: Add loanId to Payment if missing
DO $$ BEGIN
  ALTER TABLE "Payment" ADD COLUMN "loanId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Step 5: Add FK for Payment.loanId if missing
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 6: Create indexes for Loan
CREATE INDEX IF NOT EXISTS "Loan_tenantId_idx" ON "Loan"("tenantId");
CREATE INDEX IF NOT EXISTS "Loan_clientId_idx" ON "Loan"("clientId");
CREATE INDEX IF NOT EXISTS "Loan_userId_idx" ON "Loan"("userId");
CREATE INDEX IF NOT EXISTS "Loan_status_idx" ON "Loan"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Loan_tenantId_loanNumber_key" ON "Loan"("tenantId", "loanNumber");

-- Step 7: Create indexes for LoanPaymentSchedule
CREATE INDEX IF NOT EXISTS "LoanPaymentSchedule_loanId_idx" ON "LoanPaymentSchedule"("loanId");
CREATE INDEX IF NOT EXISTS "LoanPaymentSchedule_dueDate_idx" ON "LoanPaymentSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS "LoanPaymentSchedule_status_idx" ON "LoanPaymentSchedule"("status");

-- Step 8: Create index for Payment.loanId
CREATE INDEX IF NOT EXISTS "Payment_loanId_idx" ON "Payment"("loanId");
