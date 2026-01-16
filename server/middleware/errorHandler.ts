import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { formatPrismaError, ErrorMessages } from "../utils/errorMessages";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    const fieldName = firstError.path.join(".");
    const message = firstError.message;
    
    res.status(400).json({ 
      error: `${fieldName}: ${message}`,
      field: fieldName,
      details: process.env.NODE_ENV === "development" ? err.errors : undefined
    });
    return;
  }

  // Handle Prisma errors
  if (err.code) {
    console.error("Prisma error code:", err.code);
    
    // Unique constraint violation
    if (err.code === "P2002") {
      const fields = err.meta?.target || ["field"];
      res.status(409).json({ 
        error: `A record with this ${fields.join(", ")} already exists. Please use a different value.`
      });
      return;
    }
    
    // Record not found
    if (err.code === "P2025") {
      res.status(404).json({ error: "The requested record was not found" });
      return;
    }
    
    // Foreign key constraint violation
    if (err.code === "P2003") {
      res.status(400).json({ error: "Invalid reference: Related record does not exist" });
      return;
    }
    
    // Numeric field overflow (the issue we just fixed)
    if (err.code === "22003" || err.message?.includes("numeric field overflow")) {
      res.status(400).json({ 
        error: "Value too large: One of the numeric fields exceeds the maximum allowed value. Please check your percentage or amount values."
      });
      return;
    }
  }

  // Handle PostgreSQL errors
  if (err.severity === "ERROR") {
    if (err.code === "22003") {
      res.status(400).json({ 
        error: "Numeric value overflow: Please ensure all percentage values are within valid ranges (0-99.99% for interest rates)"
      });
      return;
    }
  }

  // Default error
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === "production" 
      ? ErrorMessages.INTERNAL_ERROR
      : err.message || ErrorMessages.INTERNAL_ERROR
  });
};
