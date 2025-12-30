import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    status: string;
  };
}

/**
 * Middleware to resolve tenant from URL path /t/:slug
 * Attaches tenant info to req.tenant
 */
export async function tenantResolver(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // The slug is in req.params when using router.use("/t/:slug", ...)
    const slug = req.params.slug;
    
    if (!slug) {
      res.status(400).json({ error: "Tenant slug not found in URL" });
      return;
    }

    // Look up tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        plan: true,
        status: true,
      },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    if (tenant.status === "suspended") {
      res.status(403).json({ error: "Tenant account is suspended" });
      return;
    }

    if (tenant.status === "canceled") {
      res.status(403).json({ error: "Tenant account is canceled" });
      return;
    }

    // Attach tenant to request
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Tenant resolution error:", error);
    res.status(500).json({ error: "Failed to resolve tenant" });
  }
}
