import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  type: z.enum(["individual", "business"]).default("individual"),
  taxId: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  mailingAddress: z.string().optional(),
  physicalAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("US"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();
