import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId?: string;
    email?: string;
    role?: string;
    userType?: 'client' | 'staff';
    clientId?: string;
  };
}

// Define a global RequestHandler type for async functions
declare global {
  namespace Express {
    interface RequestHandler {
      (req: Request, res: Response, next: NextFunction): Promise<any> | any;
    }
  }
}