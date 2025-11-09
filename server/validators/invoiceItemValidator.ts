import { z } from "zod";

export const createInvoiceItemSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
});

export const updateInvoiceItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
});
