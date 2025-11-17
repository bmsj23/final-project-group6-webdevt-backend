import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/tokenUtils.js';
import User from '../models/User.model.js';

// protect routes - require authentication
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // check for token in authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // check if token exists
  if (!token) {
    throw new AppError('Not authorized to access this route', 401);
  }

  try {
    // verify token
    const decoded = verifyAccessToken(token);

    // get user from token
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // check if user is suspended
    if (user.isSuspended) {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }

    // attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.statusCode === 403) {
      throw error;
    }
    throw new AppError('Not authorized to access this route', 401);
  }
});

// alias for backward compatibility
export const protect = authenticate;

// restrict to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  };
};

// check if user is the owner of a resource
export const checkOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    const resource = req.resource; // resource should be attached to req by previous middleware

    if (!resource) {
      throw new AppError('Resource not found', 404);
    }

    // admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // check if user is the owner
    const resourceUserId = resource[resourceUserField]?._id || resource[resourceUserField];

    if (resourceUserId.toString() !== req.user._id.toString()) {
      throw new AppError('You do not have permission to access this resource', 403);
    }

    next();
  };
};