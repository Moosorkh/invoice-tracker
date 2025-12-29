/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/--+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Trim hyphens from start
    .replace(/-+$/, ""); // Trim hyphens from end
}

/**
 * Generate a unique slug for a tenant
 * If slug already exists, append a number
 */
export async function generateUniqueTenantSlug(
  prisma: any,
  baseName: string
): Promise<string> {
  let slug = generateSlug(baseName);
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existing = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!existing) {
      isUnique = true;
    } else {
      slug = `${generateSlug(baseName)}-${counter}`;
      counter++;
    }
  }

  return slug;
}
