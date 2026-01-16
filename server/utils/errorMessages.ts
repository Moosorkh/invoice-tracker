/**
 * User-friendly error messages for common scenarios
 */

export const ErrorMessages = {
  // Authentication
  UNAUTHORIZED: "You must be logged in to perform this action",
  INVALID_CREDENTIALS: "Invalid email or password",
  TOKEN_EXPIRED: "Your session has expired. Please log in again",
  
  // Tenant/Multi-tenancy
  NO_TENANT: "No organization is associated with your account",
  INVALID_TENANT: "You don't have access to this organization",
  TENANT_LIMIT_REACHED: "You've reached the limit for your subscription plan. Please upgrade to add more.",
  
  // Validation
  VALIDATION_ERROR: "Please check your input and try again",
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `${field} has an invalid format`,
  VALUE_TOO_LARGE: (field: string, max: number) => `${field} cannot exceed ${max}`,
  VALUE_TOO_SMALL: (field: string, min: number) => `${field} must be at least ${min}`,
  
  // Database errors
  RECORD_NOT_FOUND: (type: string) => `${type} not found`,
  DUPLICATE_RECORD: (field: string) => `A record with this ${field} already exists`,
  FOREIGN_KEY_VIOLATION: "Cannot complete this action: related record does not exist",
  
  // Loan-specific
  LOAN_NOT_FOUND: "Loan not found or you don't have access to it",
  LOAN_ALREADY_ACTIVE: "This loan is already active and cannot be modified",
  LOAN_PAYMENT_FAILED: "Failed to process loan payment. Please verify the amount and try again",
  INVALID_INTEREST_RATE: "Interest rate must be between 0% and 99.99%",
  INVALID_LATE_FEE: "Late fee percentage must be between 0% and 100%",
  
  // Invoice-specific
  INVOICE_NOT_FOUND: "Invoice not found or you don't have access to it",
  INVOICE_ALREADY_PAID: "This invoice has already been paid",
  
  // Client-specific
  CLIENT_NOT_FOUND: "Client not found or you don't have access to it",
  CLIENT_EMAIL_EXISTS: "A client with this email already exists in your organization",
  
  // Payment-specific
  PAYMENT_EXCEEDS_BALANCE: "Payment amount exceeds the outstanding balance",
  INVALID_PAYMENT_AMOUNT: "Payment amount must be greater than zero",
  
  // Generic
  INTERNAL_ERROR: "An unexpected error occurred. Please try again or contact support if the problem persists",
  NETWORK_ERROR: "Network error. Please check your connection and try again",
};

/**
 * Format Prisma error codes into user-friendly messages
 */
export function formatPrismaError(code: string, meta?: any): string {
  switch (code) {
    case "P2002":
      const fields = meta?.target?.join(", ") || "value";
      return `A record with this ${fields} already exists`;
    case "P2003":
      return ErrorMessages.FOREIGN_KEY_VIOLATION;
    case "P2025":
      return "The requested record was not found";
    default:
      return ErrorMessages.INTERNAL_ERROR;
  }
}
