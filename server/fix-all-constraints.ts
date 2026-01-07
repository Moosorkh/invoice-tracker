import { prisma } from "./utils/prisma";

async function fixAllConstraints() {
  try {
    console.log("Fixing multi-tenant constraints...\n");

    // Fix Invoice constraints
    console.log("1. Fixing Invoice constraints...");
    await prisma.$executeRaw`
      ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_key" 
      ON "Invoice"("tenantId", "invoiceNumber");
    `;
    console.log("✓ Invoice constraints fixed");

    // Fix Client constraints
    console.log("\n2. Fixing Client constraints...");
    await prisma.$executeRaw`
      ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_email_key";
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Client_tenantId_email_key" 
      ON "Client"("tenantId", "email");
    `;
    console.log("✓ Client constraints fixed");

    // Fix Loan constraints
    console.log("\n3. Fixing Loan constraints...");
    await prisma.$executeRaw`
      ALTER TABLE "Loan" DROP CONSTRAINT IF EXISTS "Loan_loanNumber_key";
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Loan_tenantId_loanNumber_key" 
      ON "Loan"("tenantId", "loanNumber");
    `;
    console.log("✓ Loan constraints fixed");

    // Verify Invoice constraints
    const invoiceIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Invoice'
      AND indexname LIKE '%invoiceNumber%'
      ORDER BY indexname;
    `;
    console.log("\n=== Invoice Indexes ===");
    console.log(invoiceIndexes);

    // Verify Client constraints
    const clientIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Client'
      AND indexname LIKE '%email%'
      ORDER BY indexname;
    `;
    console.log("\n=== Client Indexes ===");
    console.log(clientIndexes);

    // Verify Loan constraints
    const loanIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Loan'
      AND indexname LIKE '%loanNumber%'
      ORDER BY indexname;
    `;
    console.log("\n=== Loan Indexes ===");
    console.log(loanIndexes);

    console.log("\n✅ All multi-tenant constraints fixed successfully!");

  } catch (error) {
    console.error("Error fixing constraints:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllConstraints();
