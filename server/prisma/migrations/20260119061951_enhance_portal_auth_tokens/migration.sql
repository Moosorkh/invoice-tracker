-- AlterTable
-- Add `type` with a DB-level default so this migration succeeds even if the table already has rows.
ALTER TABLE "PortalAuthToken" ADD COLUMN     "portalUserId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'magic_link',
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PortalAuthToken_portalUserId_idx" ON "PortalAuthToken"("portalUserId");

-- CreateIndex
CREATE INDEX "PortalAuthToken_type_idx" ON "PortalAuthToken"("type");
