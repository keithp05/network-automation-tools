import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}