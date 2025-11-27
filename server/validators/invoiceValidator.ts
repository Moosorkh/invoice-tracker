import { z } from "zod";

// Helper to validate decimal values as numbers
const decimalSchema = z.number().positive("Amount must be positive");

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  amount: decimalSchema,
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  dueDate: z.string().datetime().optional(),
  description: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  amount: decimalSchema.optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  dueDate: z.string().datetime().optional(),
  description: z.string().optional(),
});
