/*
  Warnings:

  - The `role` column on the `UserTenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `UserTenant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER');

-- AlterTable
ALTER TABLE "PortalAuthToken" ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable - Add updatedAt with default
ALTER TABLE "UserTenant" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add temporary column for new enum role
ALTER TABLE "UserTenant" ADD COLUMN "role_new" "UserRole";

-- Migrate existing role data (convert lowercase to UPPERCASE enum values)
UPDATE "UserTenant" SET "role_new" = 
  CASE 
    WHEN UPPER("role") = 'OWNER' THEN 'OWNER'::"UserRole"
    WHEN UPPER("role") = 'ADMIN' THEN 'ADMIN'::"UserRole"
    WHEN UPPER("role") = 'MANAGER' THEN 'MANAGER'::"UserRole"
    WHEN UPPER("role") = 'OPERATOR' THEN 'OPERATOR'::"UserRole"
    WHEN UPPER("role") = 'VIEWER' THEN 'VIEWER'::"UserRole"
    ELSE 'VIEWER'::"UserRole"
  END;

-- Set default for rows that didn't have a role
UPDATE "UserTenant" SET "role_new" = 'VIEWER'::"UserRole" WHERE "role_new" IS NULL;

-- Make role_new NOT NULL
ALTER TABLE "UserTenant" ALTER COLUMN "role_new" SET NOT NULL;

-- Drop old role column
ALTER TABLE "UserTenant" DROP COLUMN "role";

-- Rename role_new to role
ALTER TABLE "UserTenant" RENAME COLUMN "role_new" TO "role";

-- Set default for future inserts
ALTER TABLE "UserTenant" ALTER COLUMN "role" SET DEFAULT 'VIEWER'::"UserRole";

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserTenant_role_idx" ON "UserTenant"("role");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
