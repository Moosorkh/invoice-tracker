/*
  Warnings:

  - You are about to drop the column `address` on the `Client` table. All the data in the column will be lost.
  - You are about to alter the column `interestRate` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(5,4)`.
  - Added the required column `firstDueDate` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "address",
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'US',
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "mailingAddress" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "physicalAddress" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'individual',
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "amortizationType" TEXT NOT NULL DEFAULT 'amortizing',
ADD COLUMN     "currentFees" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "currentInterest" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "currentPrincipal" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "firstDueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "graceDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "lateFeeAmount" DECIMAL(19,4),
ADD COLUMN     "lateFeePercent" DECIMAL(5,2),
ADD COLUMN     "rateType" TEXT NOT NULL DEFAULT 'fixed',
ADD COLUMN     "substatus" TEXT,
ALTER COLUMN "interestRate" SET DATA TYPE DECIMAL(5,4),
ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "maxInvoices" SET DEFAULT 50,
ALTER COLUMN "maxLoans" SET DEFAULT 10,
ALTER COLUMN "maxUsers" SET DEFAULT 3;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ClientAddress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanDocument" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "notes" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanEvent" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "principalAmount" DECIMAL(19,4),
    "interestAmount" DECIMAL(19,4),
    "feeAmount" DECIMAL(19,4),
    "principalBalance" DECIMAL(19,4) NOT NULL,
    "interestBalance" DECIMAL(19,4) NOT NULL,
    "feeBalance" DECIMAL(19,4) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "reversedBy" TEXT,
    "reversalOf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");

-- CreateIndex
CREATE INDEX "ClientAddress_type_idx" ON "ClientAddress"("type");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_idx" ON "ClientDocument"("clientId");

-- CreateIndex
CREATE INDEX "ClientDocument_type_idx" ON "ClientDocument"("type");

-- CreateIndex
CREATE INDEX "LoanDocument_loanId_idx" ON "LoanDocument"("loanId");

-- CreateIndex
CREATE INDEX "LoanDocument_type_idx" ON "LoanDocument"("type");

-- CreateIndex
CREATE INDEX "LoanEvent_loanId_idx" ON "LoanEvent"("loanId");

-- CreateIndex
CREATE INDEX "LoanEvent_type_idx" ON "LoanEvent"("type");

-- CreateIndex
CREATE INDEX "LoanEvent_effectiveDate_idx" ON "LoanEvent"("effectiveDate");

-- CreateIndex
CREATE INDEX "LoanEvent_createdAt_idx" ON "LoanEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Loan_substatus_idx" ON "Loan"("substatus");

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanDocument" ADD CONSTRAINT "LoanDocument_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanEvent" ADD CONSTRAINT "LoanEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
