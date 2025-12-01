import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId?: string;
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