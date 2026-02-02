import { Router, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { registerSchema, loginSchema } from "../validators/authValidator";
import { authMiddleware } from "../middleware/authMiddleware";
import { prisma } from "../utils/prisma";
import { generateUniqueTenantSlug } from "../utils/slugGenerator";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Register User
const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user, tenant, and link them in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { 
          email: validatedData.email, 
          password: hashedPassword 
        },
      });

      // Extract company name from email or use default
      const tenantName = validatedData.companyName || 
        validatedData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() + "'s Company";

      // Generate unique slug for tenant
      const slug = await generateUniqueTenantSlug(tx, tenantName);

      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
          plan: "free",
          status: "active",
        },
      });

      await tx.userTenant.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "OWNER",
        },
      });

      return { user, tenant };
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = result.user;
    
    res.status(201).json({ 
      message: "User registered successfully",
      data: {
        ...userWithoutPassword,
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
        tenantSlug: result.tenant.slug,
      }
    });
  } catch (err) {
    next(err); // Pass error to centralized error handler
  }
};
router.post("/register", registerHandler);
// Login User
const loginHandler: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ 
      where: { email: validatedData.email },
      include: {
        tenants: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(validatedData.password, user.password))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Get first tenant (for now, multi-tenant selection will come later)
    const userTenant = user.tenants[0];
    
    if (!userTenant) {
      res.status(400).json({ error: "No tenant associated with user" });
      return;
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        tenantId: userTenant.tenantId,
        role: userTenant.role,
        userType: "staff",
      }, 
      JWT_SECRET, 
      { expiresIn: "5h" }
    );
    
    res.json({ 
      token, 
      userId: user.id,
      email: user.email,
      tenantId: userTenant.tenantId,
      tenantName: userTenant.tenant.name,
      tenantSlug: userTenant.tenant.slug,
      role: userTenant.role,
    });
  } catch (err) {
    next(err);
  }
};
router.post("/login", loginHandler);

// Protected Route - Get Current User Profile
const meHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    res.json({ data: user });
  } catch (err) {
    next(err); // Use error handler middleware for consistency
  }
};
router.get("/me", authMiddleware, meHandler);

export default router;