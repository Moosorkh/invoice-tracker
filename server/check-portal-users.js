// Check existing portal users
const { PrismaClient } = require("@prisma/client");

async function checkPortalUsers() {
  const prisma = new PrismaClient();
  
  try {
    const users = await prisma.clientUser.findMany({
      include: {
        client: { select: { name: true } },
        tenant: { select: { name: true, slug: true } }
      }
    });
    
    console.log("Portal users:");
    users.forEach(u => {
      console.log(`\nEmail: ${u.email}`);
      console.log(`Client: ${u.client.name}`);
      console.log(`Tenant: ${u.tenant.name} (slug: ${u.tenant.slug})`);
      console.log(`Status: ${u.status}`);
      console.log(`Has password: ${u.password ? "Yes" : "No"}`);
      console.log(`Portal URL: https://invoice-tracker.up.railway.app/portal/${u.tenant.slug}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPortalUsers();
