import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
