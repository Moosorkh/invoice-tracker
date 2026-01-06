import { prisma } from "./utils/prisma";

async function checkConstraints() {
  try {
    // Query to check what unique constraints exist on Invoice table
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

    console.log("=== Invoice Table Constraints ===");
    console.log(JSON.stringify(constraints, null, 2));

    // Check for any invoices with duplicate invoice numbers across tenants
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "invoiceNumber",
        COUNT(*) as count,
        array_agg("tenantId") as tenant_ids,
        array_agg("id") as invoice_ids
      FROM "Invoice"
      GROUP BY "invoiceNumber"
      HAVING COUNT(*) > 1;
    `;

    console.log("\n=== Duplicate Invoice Numbers (across tenants) ===");
    console.log(JSON.stringify(duplicates, null, 2));

    // Check invoice counts per tenant
    const tenantCounts = await prisma.$queryRaw`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        COUNT(i.id) as invoice_count
      FROM "Tenant" t
      LEFT JOIN "Invoice" i ON i."tenantId" = t.id
      GROUP BY t.id, t.name
      ORDER BY invoice_count DESC;
    `;

    console.log("\n=== Invoices per Tenant ===");
    console.log(JSON.stringify(tenantCounts, null, 2));

  } catch (error) {
    console.error("Error checking constraints:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConstraints();
