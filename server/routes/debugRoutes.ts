import express from "express";
import prisma from "../utils/prisma";

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
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
