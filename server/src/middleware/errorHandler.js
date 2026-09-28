const errorHandler = (err, req, res, next) => {
  console.error('[CQMS Error]:', err);

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected server error occurred. Please try again.';

  // Handle specific MySQL errors gracefully without exposing raw database strings
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A duplicate record already exists.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    message = 'Associated entity reference could not be found or is in use.';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    statusCode = 503;
    message = 'The database service is currently unavailable. Please try again in a moment.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { devDetails: err.message })
  });
};

module.exports = errorHandler;
