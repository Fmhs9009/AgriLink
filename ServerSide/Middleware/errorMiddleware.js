const ErrorHandler = require('../utils/errorHandler');
const { STATUS_CODES } = require('../config/constants');

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  // Always set CORS headers
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  err.statusCode = err.statusCode || STATUS_CODES.SERVER_ERROR;
  err.message = err.message || 'Internal Server Error';

  // Standardize error response format
  const errorResponse = {
    success: false,
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      details: err
    } : undefined
  };

  // Handle specific error types
  switch (true) {
    // MongoDB Invalid ID error
    case err.name === 'CastError':
      errorResponse.message = `Invalid ${err.path}: ${err.value}`;
      err.statusCode = STATUS_CODES.BAD_REQUEST;
      break;

    // Mongoose validation error
    case err.name === 'ValidationError':
      errorResponse.message = Object.values(err.errors)
        .map(error => error.message)
        .join(', ');
      errorResponse.errors = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      err.statusCode = STATUS_CODES.VALIDATION_ERROR;
      break;

    // Mongoose duplicate key error
    case err.code === 11000:
      const field = Object.keys(err.keyValue)[0];
      errorResponse.message = `Duplicate value entered for ${field}`;
      err.statusCode = STATUS_CODES.BAD_REQUEST;
      break;

    // JWT errors
    case err.name === 'JsonWebTokenError':
      errorResponse.message = 'Invalid token. Please log in again.';
      err.statusCode = STATUS_CODES.UNAUTHORIZED;
      break;

    case err.name === 'TokenExpiredError':
      errorResponse.message = 'Token has expired. Please log in again.';
      err.statusCode = STATUS_CODES.UNAUTHORIZED;
      break;

    // Multer errors
    case err.code === 'LIMIT_FILE_SIZE':
      errorResponse.message = 'File size is too large';
      err.statusCode = STATUS_CODES.BAD_REQUEST;
      break;

    case err.code === 'LIMIT_UNEXPECTED_FILE':
      errorResponse.message = 'Too many files uploaded';
      err.statusCode = STATUS_CODES.BAD_REQUEST;
      break;

    // Handle other specific error types as needed
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode: err.statusCode,
      message: err.message,
      stack: err.stack
    });
  }

  // Send error response
  res.status(err.statusCode).json(errorResponse);
};

module.exports = errorMiddleware; 