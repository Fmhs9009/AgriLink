const jwt = require("jsonwebtoken");
require("dotenv").config();
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../Middleware/catchAsyncErrors');
const User = require('../Model/User');
const { ROLES } = require('../config/constants');

/**
 * Middleware to verify JWT token and attach user to request
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    let token = null;
    
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, check cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
   // console.log('Auth headers:', req.headers.authorization);
   // console.log('Cookies:', req.cookies);
   // console.log('Extracted token:', token ? 'Token found' : 'No token found');

    if (!token) {
      return next(new ErrorHandler('Authentication token is missing', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //  console.log('Decoded token:', decoded);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Attach user to request
      req.user = user;
   //   console.log('User attached to request:', user._id);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return next(new ErrorHandler('Token has expired', 401));
      }
      return next(new ErrorHandler('Invalid token', 401));
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return next(new ErrorHandler('Authentication failed', 500));
  }
};

/**
 * Middleware for role-based authorization
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler('User not authenticated', 401));
    }

    const userRole = req.user.role || req.user.accountType;
    
    if (!roles.includes(userRole)) {
      return next(new ErrorHandler(
        `Role (${userRole}) is not authorized to access this resource`,
        403
      ));
    }

    next();
  };
};

/**
 * Middleware to check if user is active
 */
const isActiveUser = async (req, res, next) => {
  if (!req.user.isActive) {
    return next(new ErrorHandler('Your account is not active', 403));
  }
  next();
};

/**
 * Middleware to check if user is verified
 */
const isVerifiedUser = async (req, res, next) => {
  if (!req.user.isVerified) {
    return next(new ErrorHandler('Please verify your email first', 403));
  }
  next();
};

// Role-specific middleware shortcuts
const isFarmer = authorize(ROLES.FARMER);
const isBuyer = authorize(ROLES.BUYER);
const isAdmin = authorize(ROLES.ADMIN);

module.exports = {
  verifyToken,
  authorize,
  isActiveUser,
  isVerifiedUser,
  isFarmer,
  isBuyer,
  isAdmin
};
