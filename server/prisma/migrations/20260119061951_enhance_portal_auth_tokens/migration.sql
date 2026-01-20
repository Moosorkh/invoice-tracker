-- Delete existing tokens (they're temporary and expire anyway)
DELETE FROM "PortalAuthToken";

-- AlterTable
ALTER TABLE "PortalAuthToken" ADD COLUMN     "portalUserId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PortalAuthToken_portalUserId_idx" ON "PortalAuthToken"("portalUserId");

-- CreateIndex
CREATE INDEX "PortalAuthToken_type_idx" ON "PortalAuthToken"("type");
