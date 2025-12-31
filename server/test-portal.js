const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Change this to your tenant slug from localStorage
  const TENANT_SLUG = process.argv[2] || 'owner1s-company';
  
  const tenant = await prisma.tenant.findFirst({ 
    where: { slug: TENANT_SLUG },
    select: { id: true, slug: true, name: true }
  });
  
  console.log('Tenant:', JSON.stringify(tenant, null, 2));
  
  if (!tenant) {
    console.log('Tenant not found');
    process.exit(1);
  }
  
  const client = await prisma.client.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'borrower@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Demo Borrower',
      email: 'borrower@demo.com',
    }
  });
  
  console.log('Client created');
  
  const clientUser = await prisma.clientUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'borrower@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client.id,
      email: 'borrower@demo.com',
      name: 'Demo Borrower',
      status: 'active',
    }
  });
  
  console.log('ClientUser created');
  console.log('\n=== TEST THE PORTAL ===');
  console.log('1. Go to: https://invoice-tracker.up.railway.app/t/' + tenant.slug + '/portal/login');
  console.log('2. Enter email: borrower@demo.com');
  console.log('3. Check Railway logs for the magic link token');
  await prisma.$disconnect();
})();
