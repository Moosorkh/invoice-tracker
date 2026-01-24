// Quick script to add slug to tenant that's missing it
const { PrismaClient } = require("@prisma/client");

async function fixTenantSlug() {
  const prisma = new PrismaClient();
  
  try {
    // Find tenants without proper slugs
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, slug: true }
    });
    
    console.log("Current tenants:", tenants);
    
    for (const tenant of tenants) {
      if (!tenant.slug || tenant.slug === "" || tenant.slug === "undefined") {
        // Generate slug from name
        const baseSlug = tenant.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        
        let slug = baseSlug;
        let counter = 1;
        
        // Check if slug exists
        while (true) {
          const existing = await prisma.tenant.findUnique({
            where: { slug }
          });
          
          if (!existing || existing.id === tenant.id) {
            break;
          }
          
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        // Update tenant with slug
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { slug }
        });
        
        console.log(`✅ Updated tenant "${tenant.name}" with slug: ${slug}`);
      } else {
        console.log(`✓ Tenant "${tenant.name}" already has slug: ${tenant.slug}`);
      }
    }
    
    console.log("\n✅ All tenants now have slugs!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTenantSlug();
