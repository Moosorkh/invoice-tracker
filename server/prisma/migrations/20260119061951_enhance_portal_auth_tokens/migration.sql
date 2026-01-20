-- First, add the column as nullable
ALTER TABLE "PortalAuthToken" ADD COLUMN     "portalUserId" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- Update existing rows to have a default type
UPDATE "PortalAuthToken" SET "type" = 'magic_link' WHERE "type" IS NULL;

-- Now make it NOT NULL
ALTER TABLE "PortalAuthToken" ALTER COLUMN "type" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PortalAuthToken_portalUserId_idx" ON "PortalAuthToken"("portalUserId");

-- CreateIndex
CREATE INDEX "PortalAuthToken_type_idx" ON "PortalAuthToken"("type");
