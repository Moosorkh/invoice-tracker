-- CreateTable: Subscription (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Subscription'
  ) THEN
    CREATE TABLE "Subscription" (
      "id" TEXT NOT NULL,
      "tenantId" TEXT NOT NULL,
      "stripeSubscriptionId" TEXT,
      "stripePriceId" TEXT,
      "stripeProductId" TEXT,
      "plan" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "currentPeriodStart" TIMESTAMP(3),
      "currentPeriodEnd" TIMESTAMP(3),
      "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
      "canceledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- Create unique index on stripeSubscriptionId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_stripeSubscriptionId_key'
  ) THEN
    CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
  END IF;
END $$;

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_tenantId_idx') THEN
    CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_stripeSubscriptionId_idx') THEN
    CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_status_idx') THEN
    CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
  END IF;
END $$;

-- Add foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_tenantId_fkey'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
