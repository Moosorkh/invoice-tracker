import express from "express";
import { prisma } from "../utils/prisma";

const router = express.Router();

// DEBUG ENDPOINT - Check what unique indexes exist in prod
router.get("/check-indexes", async (req, res) => {
  try {
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
        AND t.relname IN ('Client','ClientUser','Invoice','Loan','User')
      ORDER BY t.relname, i.relname;
    `;

    res.json({
      success: true,
      indexes: uniqueIndexes,
      analysis: {
        hasGlobalClientEmailIndex: uniqueIndexes.some(
          (idx: any) => idx.index_name === "Client_email_key"
        ),
        hasTenantScopedClientEmailIndex: uniqueIndexes.some(
          (idx: any) => idx.index_name === "Client_tenantId_email_key"
        ),
        hasGlobalInvoiceNumberIndex: uniqueIndexes.some(
          (idx: any) => idx.index_name === "Invoice_invoiceNumber_key"
        ),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// FIX ENDPOINT - Drop the problematic global indexes
router.post("/fix-global-indexes", async (req, res) => {
  try {
    // Drop the global indexes that are causing 409 conflicts
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Client_email_key"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Invoice_invoiceNumber_key"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "ClientUser_email_key"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Loan_loanNumber_key"`);

    // Verify they're gone
    const remainingIndexes = await prisma.$queryRaw<any[]>`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      WHERE ix.indisunique
        AND t.relnamespace = 'public'::regnamespace
        AND i.relname IN ('Client_email_key', 'Invoice_invoiceNumber_key', 'ClientUser_email_key', 'Loan_loanNumber_key');
    `;

    res.json({
      success: true,
      message: "Global indexes dropped successfully",
      droppedIndexes: [
        "Client_email_key",
        "Invoice_invoiceNumber_key", 
        "ClientUser_email_key",
        "Loan_loanNumber_key"
      ],
      remainingGlobalIndexes: remainingIndexes,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
