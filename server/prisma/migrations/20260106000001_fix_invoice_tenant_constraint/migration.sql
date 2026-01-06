-- Fix missing composite unique constraint for multi-tenant invoice numbers
-- This ensures invoice numbers are unique per tenant, not globally

-- Drop old global unique constraint if it exists
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";

-- Create composite unique index for invoice numbers scoped to tenant
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_key" 
ON "Invoice"("tenantId", "invoiceNumber");
