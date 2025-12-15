import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({ 
      error: "Validation error",
      details: err.errors 
    });
    return;
  }

  // Handle Prisma errors
  if (err.code) {
    console.error("Prisma error code:", err.code);
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with this data already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }

  // Default error
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === "production" 
      ? "Internal server error" 
      : err.message || "Internal server error"
  });
};
