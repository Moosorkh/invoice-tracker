import { z } from "zod";

const decimalSchema = z.number().positive("Amount must be positive");

export const createLoanSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  principal: decimalSchema,
  interestRate: z.number().min(0).max(100, "Interest rate must be between 0 and 100"),
  termMonths: z.number().int().min(1, "Term must be at least 1 month"),
  paymentFrequency: z.enum(["monthly", "biweekly", "weekly"]).default("monthly"),
  startDate: z.string().datetime(),
  description: z.string().optional(),
});

export const updateLoanSchema = z.object({
  status: z.enum(["active", "closed", "charged_off", "delinquent"]).optional(),
  nextDueDate: z.string().datetime().optional(),
  description: z.string().optional(),
});
