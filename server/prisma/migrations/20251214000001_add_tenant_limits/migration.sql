-- Add plan limit columns to Tenant table
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxClients" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxInvoices" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxLoans" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 1;

-- Add tenantId to Loan table if not exists
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Set default tenant for existing loans
UPDATE "Loan" SET "tenantId" = 'default-tenant-migration' WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL for loans
ALTER TABLE "Loan" ALTER COLUMN "tenantId" SET NOT NULL;

-- Add foreign key constraint for Loan.tenantId
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for Loan.tenantId
CREATE INDEX IF NOT EXISTS "Loan_tenantId_idx" ON "Loan"("tenantId");
