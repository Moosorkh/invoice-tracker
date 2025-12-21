-- NOTE:
-- This migration exists only to allow Prisma to resolve a previously failed migration
-- in the production database (Railway) named `20251214000001_add_tenant_limits`.
--
-- The project now enforces tenant limits in application code (see `server/utils/planLimits.ts`),
-- so this migration is intentionally a no-op.

SELECT 1;
