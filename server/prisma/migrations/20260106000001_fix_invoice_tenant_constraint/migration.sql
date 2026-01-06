-- Fix missing composite unique constraints for multi-tenant data
-- This ensures data is unique per tenant, not globally

-- Fix Invoice: invoice numbers should be unique per tenant
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_key" 
ON "Invoice"("tenantId", "invoiceNumber");

-- Fix Client: email addresses should be unique per tenant
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Client_tenantId_email_key" 
ON "Client"("tenantId", "email");

-- Fix Loan: loan numbers should be unique per tenant
ALTER TABLE "Loan" DROP CONSTRAINT IF EXISTS "Loan_loanNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Loan_tenantId_loanNumber_key" 
ON "Loan"("tenantId", "loanNumber");
