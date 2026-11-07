export const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err.stack || err.message || err);

  const statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
