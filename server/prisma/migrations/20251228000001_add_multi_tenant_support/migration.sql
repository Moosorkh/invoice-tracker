-- Add multi-tenant support: tenant slugs, client portal users, and magic link auth

-- Add slug to Tenant table
ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Create index for faster slug lookups
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- Create ClientUser table for client portal access
CREATE TABLE "ClientUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

-- Create PortalAuthToken table for magic link authentication
CREATE TABLE "PortalAuthToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAuthToken_pkey" PRIMARY KEY ("id")
);

-- Create unique index on ClientUser (tenantId, email)
CREATE UNIQUE INDEX "ClientUser_tenantId_email_key" ON "ClientUser"("tenantId", "email");

-- Create indexes for ClientUser
CREATE INDEX "ClientUser_tenantId_idx" ON "ClientUser"("tenantId");
CREATE INDEX "ClientUser_clientId_idx" ON "ClientUser"("clientId");
CREATE INDEX "ClientUser_email_idx" ON "ClientUser"("email");

-- Create unique index on PortalAuthToken token
CREATE UNIQUE INDEX "PortalAuthToken_token_key" ON "PortalAuthToken"("token");

-- Create indexes for PortalAuthToken
CREATE INDEX "PortalAuthToken_token_idx" ON "PortalAuthToken"("token");
CREATE INDEX "PortalAuthToken_email_tenantId_idx" ON "PortalAuthToken"("email", "tenantId");
CREATE INDEX "PortalAuthToken_expiresAt_idx" ON "PortalAuthToken"("expiresAt");

-- Add foreign key constraints
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing tenants with slugs (based on name, with fallback)
UPDATE "Tenant" SET "slug" = 
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM("name"), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE "slug" IS NULL;

-- Handle duplicate slugs by appending tenant ID
DO $$
DECLARE
  tenant_record RECORD;
  new_slug TEXT;
BEGIN
  FOR tenant_record IN 
    SELECT id, slug FROM "Tenant" 
    WHERE slug IN (
      SELECT slug FROM "Tenant" 
      GROUP BY slug HAVING COUNT(*) > 1
    )
  LOOP
    new_slug := tenant_record.slug || '-' || SUBSTRING(tenant_record.id, 1, 8);
    UPDATE "Tenant" SET "slug" = new_slug WHERE id = tenant_record.id;
  END LOOP;
END $$;

-- Make slug NOT NULL after backfilling
ALTER TABLE "Tenant" ALTER COLUMN "slug" SET NOT NULL;
