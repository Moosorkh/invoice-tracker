// Check tenant and portal users
const { PrismaClient } = require("@prisma/client");

async function debugAuth() {
  const prisma = new PrismaClient();
  
  try {
    console.log("\n=== TENANTS ===");
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, slug: true }
    });
    tenants.forEach(t => {
      console.log(`${t.name} (slug: ${t.slug})`);
      console.log(`  ID: ${t.id}`);
    });
    
    console.log("\n=== PORTAL USERS ===");
    const portalUsers = await prisma.clientUser.findMany({
      include: {
        client: { select: { name: true } },
        tenant: { select: { name: true, slug: true } }
      }
    });
    
    if (portalUsers.length === 0) {
      console.log("No portal users found!");
    } else {
      portalUsers.forEach(u => {
        console.log(`\n${u.email}`);
        console.log(`  Client: ${u.client.name}`);
        console.log(`  Tenant: ${u.tenant.name} (${u.tenant.slug})`);
        console.log(`  Status: ${u.status}`);
        console.log(`  Has password: ${u.password && u.password.length > 0 ? "Yes" : "No"}`);
        console.log(`  Password hash length: ${u.password ? u.password.length : 0}`);
        console.log(`  Portal URL: https://invoice-tracker.up.railway.app/portal/${u.tenant.slug}`);
      });
    }
    
    console.log("\n=== STAFF USERS ===");
    const staffUsers = await prisma.user.findMany({
      include: {
        tenants: {
          include: {
            tenant: { select: { name: true, slug: true } }
          }
        }
      }
    });
    staffUsers.forEach(u => {
      console.log(`\n${u.email}`);
      u.tenants.forEach(t => {
        console.log(`  Tenant: ${t.tenant.name} (${t.tenant.slug})`);
      });
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
