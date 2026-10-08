/**
 * 404 handler for unknown API routes.
 */
export function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Centralized error handler — consistent { error: message } shape.
 */
export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  void next;

  if (res.headersSent) return;

  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join('; ') || message;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path || 'id'}`;
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  if (status >= 500) {
    console.error('[error]', err.message);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && status >= 500
      ? { stack: err.stack }
      : {}),
  });
}

/**
 * Wrap async route handlers so rejections reach errorHandler.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export default { notFound, errorHandler, asyncHandler, AppError };
