import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // Log error securely on server
  console.error('[API ERROR]', {
    method: req.method,
    url: req.url,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.status || err.statusCode || 500;
  const userMessage =
    statusCode === 500
      ? 'Something went wrong while processing your request. Your previously saved data is safe. Please try again or contact support.'
      : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
