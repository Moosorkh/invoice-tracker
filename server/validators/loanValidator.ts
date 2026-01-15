import { z } from "zod";

const decimalSchema = z.number().positive("Amount must be positive");

export const createLoanSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  principal: decimalSchema,
  interestRate: z.number().min(0).max(100, "Interest rate must be between 0 and 100"),
  rateType: z.enum(["fixed", "variable"]).default("fixed"),
  termMonths: z.number().int().min(1, "Term must be at least 1 month"),
  paymentFrequency: z.enum(["monthly", "biweekly", "weekly"]).default("monthly"),
  amortizationType: z.enum(["amortizing", "interest_only", "balloon"]).default("amortizing"),
  startDate: z.string().datetime(),
  graceDays: z.number().int().min(0).max(30).default(10),
  lateFeeAmount: z.number().min(0).optional(),
  lateFeePercent: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateLoanSchema = z.object({
  status: z.enum(["draft", "approved", "active", "paid_off", "charged_off", "in_default"]).optional(),
  substatus: z.string().optional(),
  nextDueDate: z.string().datetime().optional(),
  description: z.string().optional(),
  internalNotes: z.string().optional(),
});
