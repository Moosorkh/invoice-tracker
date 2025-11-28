#!/bin/bash

# Migration script for existing deployments
# Run this after pulling the latest code

echo "🚀 Starting migration to multi-tenant SaaS architecture..."

# Step 1: Update .env file with actual database credentials
echo "📝 Step 1: Ensure DATABASE_URL is set in .env file"
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Copy .env.example and update with your database credentials"
    exit 1
fi

# Step 2: Install new dependencies
echo "📦 Step 2: Installing new dependencies..."
npm install

# Step 3: Run the migration
echo "🗄️  Step 3: Running database migration..."
npx prisma migrate deploy

# Step 4: Generate Prisma client
echo "⚙️  Step 4: Generating Prisma client..."
npx prisma generate

# Step 5: Build TypeScript
echo "🔨 Step 5: Building TypeScript..."
npm run build

echo "✅ Migration complete!"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "1. All existing users have been migrated to a default tenant"
echo "2. Invoice numbers are now scoped per tenant (was globally unique before)"
echo "3. All monetary values now use Decimal type for precision"
echo "4. New security features: rate limiting and helmet middleware"
echo ""
echo "📚 Next steps:"
echo "- Update DATABASE_URL with production credentials before deployment"
echo "- Update JWT_SECRET with a strong random string"
echo "- Test authentication flow (registration creates tenant automatically)"
echo "- Verify existing invoices and clients are accessible"
