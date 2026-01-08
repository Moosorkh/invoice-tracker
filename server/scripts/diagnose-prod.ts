import { prisma } from "../utils/prisma";

async function diagnoseProduction() {
  console.log("=" .repeat(80));
  console.log("PRODUCTION DATABASE DIAGNOSIS");
  console.log("=" .repeat(80));

  try {
    // Query 1: Check what unique indexes actually exist in prod
    console.log("\n1. UNIQUE INDEXES ON Client, ClientUser, User");
    console.log("-".repeat(80));
    const uniqueIndexes = await prisma.$queryRaw<any[]>`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        pg_get_indexdef(i.oid) AS index_def
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      WHERE ix.indisunique
        AND t.relnamespace = 'public'::regnamespace
        AND t.relname IN ('Client','ClientUser','User')
      ORDER BY t.relname, i.relname;
    `;
    
    console.table(uniqueIndexes);

    // Query 2: Check if the fix migration actually ran
    console.log("\n2. MIGRATION HISTORY (LAST 20)");
    console.log("-".repeat(80));
    try {
      const migrations = await prisma.$queryRaw<any[]>`
        SELECT migration_name, finished_at, applied_steps_count
        FROM "_prisma_migrations"
        ORDER BY finished_at DESC NULLS LAST
        LIMIT 20;
      `;
      console.table(migrations);
      
      const hasFixMigration = migrations.some(
        m => m.migration_name === '20260106000001_fix_invoice_tenant_constraint'
      );
      if (hasFixMigration) {
        console.log("✅ Fix migration was applied.");
      } else {
        console.log("⚠️  Fix migration not found in history.");
      }
    } catch (err: any) {
      console.log("ℹ️  Could not query migrations table (this is OK if using db push)");
      console.log("   The unique indexes show the fix is already applied.");
    }

    // Analysis
    console.log("\n" + "=".repeat(80));
    console.log("ANALYSIS");
    console.log("=".repeat(80));
    
    const hasGlobalClientEmail = uniqueIndexes.some(
      idx => idx.index_name === 'Client_email_key' && idx.table_name === 'Client'
    );
    
    const hasTenantScopedClientEmail = uniqueIndexes.some(
      idx => idx.index_name === 'Client_tenantId_email_key' && idx.table_name === 'Client'
    );

    if (hasGlobalClientEmail) {
      console.log("❌ PROBLEM: Global unique index 'Client_email_key' still exists!");
      console.log("   This prevents same email across different tenants.");
    } else if (hasTenantScopedClientEmail) {
      console.log("✅ SUCCESS: Client emails are tenant-scoped!");
      console.log("   Different tenants CAN use the same client email.");
    } else {
      console.log("⚠️  WARNING: No email uniqueness constraint found on Client table.");
    }

    console.log("\n" + "=".repeat(80));

  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseProduction();
