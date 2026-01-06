import { prisma } from "./utils/prisma";

async function fixConstraint() {
  try {
    console.log("Adding composite unique constraint for invoiceNumber scoped to tenantId...\n");

    // Drop the old global unique constraint if it exists
    await prisma.$executeRaw`
      ALTER TABLE "Invoice" 
      DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";
    `;
    console.log("✓ Dropped old global invoiceNumber constraint (if it existed)");

    // Add the composite unique constraint
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_key" 
      ON "Invoice"("tenantId", "invoiceNumber");
    `;
    console.log("✓ Created composite unique index: Invoice_tenantId_invoiceNumber_key");

    // Verify the constraint was added
    const constraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'Invoice'
      AND n.nspname = 'public'
      AND c.contype IN ('u', 'p')
      ORDER BY conname;
    `;

    console.log("\n=== Updated Invoice Table Constraints ===");
    console.log(constraints);

    // Check indexes too
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Invoice'
      AND indexname LIKE '%invoiceNumber%'
      ORDER BY indexname;
    `;

    console.log("\n=== Invoice Number Indexes ===");
    console.log(indexes);

    console.log("\n✅ Constraint fix completed successfully!");

  } catch (error) {
    console.error("Error fixing constraint:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixConstraint();
