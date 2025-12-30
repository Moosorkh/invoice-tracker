const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const tenant = await prisma.tenant.findFirst({ 
    where: { name: 'Acme Loans' },
    select: { id: true, slug: true, name: true }
  });
  
  console.log('Tenant:', JSON.stringify(tenant, null, 2));
  
  if (!tenant) {
    console.log('Tenant not found');
    process.exit(1);
  }
  
  const client = await prisma.client.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'borrower@testacme.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'John Borrower',
      email: 'borrower@testacme.com',
    }
  });
  
  console.log('Client created');
  
  const clientUser = await prisma.clientUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'borrower@testacme.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client.id,
      email: 'borrower@testacme.com',
      name: 'John Borrower',
      status: 'active',
    }
  });
  
  console.log('ClientUser created');
  console.log('\n=== USE THIS SLUG ===');
  console.log('SLUG:', tenant.slug);
  await prisma.$disconnect();
})();
