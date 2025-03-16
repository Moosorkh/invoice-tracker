import { Request, Response, NextFunction } from 'express';

// Define a global RequestHandler type for async functions
declare global {
  namespace Express {
    interface RequestHandler {
      (req: Request, res: Response, next: NextFunction): Promise<any> | any;
    }
  }
}