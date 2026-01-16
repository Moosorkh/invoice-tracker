import { z } from "zod";

const decimalSchema = z.number().positive("Amount must be positive");

export const createLoanSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  
  // Product classification
  productCategory: z.enum(["mortgage", "heloc", "auto", "personal", "business"]).default("personal"),
  accrualMethod: z.enum(["amortizing", "simple_daily", "precomputed"]).default("amortizing"),
  paymentStructure: z.enum(["level", "interest_only", "balloon"]).default("level"),
  dayCountConvention: z.enum(["actual_365", "actual_360", "thirty_360"]).default("actual_365"),
  
  // Terms
  principal: decimalSchema,
  interestRate: z.number().min(0).max(100, "Interest rate must be between 0 and 100"),
  rateType: z.enum(["fixed", "variable"]).default("fixed"),
  termMonths: z.number().int().min(1, "Term must be at least 1 month"),
  paymentFrequency: z.enum(["monthly", "biweekly", "weekly"]).default("monthly"),
  amortizationType: z.enum(["amortizing", "interest_only", "balloon"]).default("amortizing"),
  startDate: z.string().datetime(),
  
  // Special structures
  interestOnlyMonths: z.number().int().min(0).optional(),
  balloonAmount: z.number().min(0).optional(),
  
  // Configuration
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
