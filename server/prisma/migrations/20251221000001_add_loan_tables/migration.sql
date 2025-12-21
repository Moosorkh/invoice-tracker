-- CreateTable
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Loan') THEN
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

      CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- CreateTable
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LoanPaymentSchedule') THEN
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

      CONSTRAINT "LoanPaymentSchedule_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Loan_tenantId_loanNumber_key') THEN
    CREATE UNIQUE INDEX "Loan_tenantId_loanNumber_key" ON "Loan"("tenantId", "loanNumber");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Loan_tenantId_idx') THEN
    CREATE INDEX "Loan_tenantId_idx" ON "Loan"("tenantId");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Loan_clientId_idx') THEN
    CREATE INDEX "Loan_clientId_idx" ON "Loan"("clientId");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Loan_userId_idx') THEN
    CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Loan_status_idx') THEN
    CREATE INDEX "Loan_status_idx" ON "Loan"("status");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoanPaymentSchedule_loanId_idx') THEN
    CREATE INDEX "LoanPaymentSchedule_loanId_idx" ON "LoanPaymentSchedule"("loanId");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoanPaymentSchedule_dueDate_idx') THEN
    CREATE INDEX "LoanPaymentSchedule_dueDate_idx" ON "LoanPaymentSchedule"("dueDate");
  END IF;
END $$;

-- CreateIndex
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoanPaymentSchedule_status_idx') THEN
    CREATE INDEX "LoanPaymentSchedule_status_idx" ON "LoanPaymentSchedule"("status");
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Loan_tenantId_fkey'
  ) THEN
    ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Loan_clientId_fkey'
  ) THEN
    ALTER TABLE "Loan" ADD CONSTRAINT "Loan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Loan_userId_fkey'
  ) THEN
    ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoanPaymentSchedule_loanId_fkey'
  ) THEN
    ALTER TABLE "LoanPaymentSchedule" ADD CONSTRAINT "LoanPaymentSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
