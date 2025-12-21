-- Add loanId column to Payment table to support loan payments
DO $$ BEGIN
  ALTER TABLE "Payment" ADD COLUMN "loanId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add foreign key constraint for Payment.loanId
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_loanId_fkey" 
    FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create index for Payment.loanId
CREATE INDEX IF NOT EXISTS "Payment_loanId_idx" ON "Payment"("loanId");

-- Make Payment.invoiceId nullable (payments can be for invoices OR loans)
DO $$ BEGIN
  ALTER TABLE "Payment" ALTER COLUMN "invoiceId" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
