import { prisma } from "./prisma";

/**
 * Execute a function within a tenant-scoped transaction.
 * Sets app.tenant_id for RLS enforcement (once RLS is enabled).
 * 
 * @param tenantId - The tenant ID to scope the transaction to
 * @param fn - The function to execute within the transaction
 * @returns The result of the function
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set tenant context for this transaction (RLS enforcement point)
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
