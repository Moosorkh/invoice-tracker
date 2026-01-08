#!/bin/bash
# Quick script to check indexes in Railway production database
# Usage: ./check-railway-indexes.sh <your-railway-database-url>

if [ -z "$1" ]; then
  echo "Usage: $0 <database-url>"
  echo "Example: $0 'postgresql://user:pass@host:5432/db'"
  exit 1
fi

DATABASE_URL="$1"

echo "Checking UNIQUE indexes in production..."
echo "========================================"

psql "$DATABASE_URL" -c "
SELECT
  t.relname AS table_name,
  i.relname AS index_name,
  pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
WHERE ix.indisunique
  AND t.relnamespace = 'public'::regnamespace
  AND t.relname IN ('Client','ClientUser','Invoice','Loan')
ORDER BY t.relname, i.relname;
"
