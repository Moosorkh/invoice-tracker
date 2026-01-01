import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(1, "Company name is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
