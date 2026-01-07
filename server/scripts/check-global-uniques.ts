import { prisma } from "../utils/prisma";

async function checkGlobalUniques() {
  console.log("=== Checking for global unique constraints (missing tenantId) ===\n");

  try {
    // Check unique constraints
    const constraints = await prisma.$queryRaw<any[]>`
      WITH uniq AS (
        SELECT c.oid, c.conname, c.conrelid, c.conkey
        FROM pg_constraint c
        WHERE c.contype = 'u'
      )
      SELECT
        uniq.conrelid::regclass AS table_name,
        uniq.conname,
        array_agg(a.attname ORDER BY k.ord) AS columns
      FROM uniq
      JOIN LATERAL unnest(uniq.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = uniq.conrelid AND a.attnum = k.attnum
      GROUP BY 1, 2
      HAVING NOT bool_or(a.attname = 'tenantId')
      ORDER BY 1, 2;
    `;

    console.log("Global unique CONSTRAINTS (should include tenantId):");
    console.table(constraints);

    // Check unique indexes
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        array_agg(a.attname ORDER BY k.ord) AS columns
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE ix.indisunique
        AND t.relname IN ('Invoice', 'Client', 'Loan', 'User', 'Payment')
      GROUP BY 1, 2
      HAVING NOT bool_or(a.attname = 'tenantId')
      ORDER BY 1, 2;
    `;

    console.log("\nGlobal unique INDEXES (should include tenantId):");
    console.table(indexes);

    console.log("\n✅ Check complete. Any rows above should be reviewed for tenant scoping.");

  } catch (error) {
    console.error("Error checking global uniques:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGlobalUniques();
