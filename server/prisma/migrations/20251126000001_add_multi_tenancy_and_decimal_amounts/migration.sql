-- CreateTable: Tenant
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingCustomerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserTenant (join table for many-to-many relationship)
CREATE TABLE "UserTenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

-- Add timestamps to User if not exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add tenantId to Client table
ALTER TABLE "Client" ADD COLUMN "tenantId" TEXT;

-- Add tenantId to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "tenantId" TEXT;

-- Create a default tenant for existing data
INSERT INTO "Tenant" ("id", "name", "plan", "status", "currency", "createdAt", "updatedAt")
VALUES ('default-tenant-migration', 'Default Organization', 'free', 'active', 'USD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Link all existing users to default tenant
INSERT INTO "UserTenant" ("id", "userId", "tenantId", "role", "createdAt")
SELECT 
    gen_random_uuid(),
    "id",
    'default-tenant-migration',
    'owner',
    CURRENT_TIMESTAMP
FROM "User";

-- Set tenantId for all existing clients
UPDATE "Client" SET "tenantId" = 'default-tenant-migration' WHERE "tenantId" IS NULL;

-- Set tenantId for all existing invoices
UPDATE "Invoice" SET "tenantId" = 'default-tenant-migration' WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL after data migration
ALTER TABLE "Client" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "tenantId" SET NOT NULL;

-- Convert Float columns to Decimal
ALTER TABLE "Invoice" ALTER COLUMN "amount" TYPE DECIMAL(19,4);
ALTER TABLE "InvoiceItem" ALTER COLUMN "quantity" TYPE DECIMAL(19,4);
ALTER TABLE "InvoiceItem" ALTER COLUMN "unitPrice" TYPE DECIMAL(19,4);
ALTER TABLE "InvoiceItem" ALTER COLUMN "amount" TYPE DECIMAL(19,4);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(19,4);

-- Drop old unique constraint on Client.email
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_email_key";

-- Drop old unique constraint on Invoice.invoiceNumber
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "UserTenant"("userId", "tenantId");
CREATE INDEX "UserTenant_userId_idx" ON "UserTenant"("userId");
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

CREATE UNIQUE INDEX "Client_tenantId_email_key" ON "Client"("tenantId", "email");
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
