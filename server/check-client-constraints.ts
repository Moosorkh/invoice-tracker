import { prisma } from "./utils/prisma";

async function checkClientConstraints() {
  try {
    // Query to check what unique constraints exist on Client table
    const constraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'Client'
      AND n.nspname = 'public'
      AND c.contype IN ('u', 'p')
      ORDER BY conname;
    `;

    console.log("=== Client Table Constraints ===");
    console.log(JSON.stringify(constraints, null, 2));

    // Check indexes
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Client'
      AND indexname LIKE '%email%'
      ORDER BY indexname;
    `;

    console.log("\n=== Client Email Indexes ===");
    console.log(JSON.stringify(indexes, null, 2));

  } catch (error) {
    console.error("Error checking constraints:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientConstraints();
