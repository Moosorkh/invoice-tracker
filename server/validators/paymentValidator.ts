import { z } from "zod";

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum([
    "cash",
    "credit_card",
    "debit_card",
    "bank_transfer",
    "check",
    "other",
  ]),
  notes: z.string().optional(),
});
