import { Router, RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { registerSchema, loginSchema } from "../validators/authValidator";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

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

    const user = await prisma.user.create({
      data: { 
        email: validatedData.email, 
        password: hashedPassword 
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.status(201).json({ 
      message: "User registered successfully",
      data: userWithoutPassword 
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
    const user = await prisma.user.findUnique({ where: { email: validatedData.email } });

    if (!user || !(await bcrypt.compare(validatedData.password, user.password))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "5h" });
    
    // Return userId along with token
    res.json({ 
      token, 
      userId: user.id,
      email: user.email
    });
  } catch (err) {
    next(err);
  }
};
router.post("/login", loginHandler);

// Protected Route - Get Current User Profile
const meHandler: RequestHandler = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        // Remove createdAt field if it doesn't exist in your schema
        // or use the correct field name from your schema
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