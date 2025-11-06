import { z } from "zod";

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  amount: z.number().positive("Amount must be positive"),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  dueDate: z.string().datetime().optional(),
  description: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  dueDate: z.string().datetime().optional(),
  description: z.string().optional(),
});
