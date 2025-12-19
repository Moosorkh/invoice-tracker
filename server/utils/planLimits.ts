export const PLAN_LIMITS = {
  free: { maxClients: 10, maxInvoices: 20, maxLoans: 5, maxUsers: 1 },
  starter: { maxClients: 50, maxInvoices: 200, maxLoans: 50, maxUsers: 5 },
  professional: { maxClients: -1, maxInvoices: -1, maxLoans: -1, maxUsers: -1 },
  enterprise: { maxClients: -1, maxInvoices: -1, maxLoans: -1, maxUsers: -1 },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
