-- Repair PortalAuthToken schema (idempotent - safe if partially applied)

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PortalAuthToken' AND column_name='portalUserId') THEN
    ALTER TABLE "PortalAuthToken" ADD COLUMN "portalUserId" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PortalAuthToken' AND column_name='type') THEN
    ALTER TABLE "PortalAuthToken" ADD COLUMN "type" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PortalAuthToken' AND column_name='usedAt') THEN
    ALTER TABLE "PortalAuthToken" ADD COLUMN "usedAt" TIMESTAMP(3);
  END IF;
END $$;

-- Set default for type column
ALTER TABLE "PortalAuthToken" ALTER COLUMN "type" SET DEFAULT 'magic_link';

-- Update any NULL values
UPDATE "PortalAuthToken" SET "type" = 'magic_link' WHERE "type" IS NULL;

-- Make type NOT NULL
ALTER TABLE "PortalAuthToken" ALTER COLUMN "type" SET NOT NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "PortalAuthToken_portalUserId_idx" ON "PortalAuthToken"("portalUserId");
CREATE INDEX IF NOT EXISTS "PortalAuthToken_type_idx" ON "PortalAuthToken"("type");
