import { z } from "zod";

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID").optional(),
  loanId: z.string().uuid("Invalid loan ID").optional(),
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
}).refine(
  (data) => (data.invoiceId && !data.loanId) || (!data.invoiceId && data.loanId),
  { message: "Payment must be for either an invoice or a loan, not both" }
);
