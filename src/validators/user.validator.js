import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';

// validate profile update
export const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),

  body('contactNumber')
    .optional()
    .matches(/^(09|\+639)\d{9}$/)
    .withMessage('Invalid Philippine contact number format'),

  body('profilePicture')
    .optional()
    .isURL()
    .withMessage('Invalid profile picture URL'),

  validate,
];

// validate seller info update
export const updateSellerInfoValidator = [
  body('sellerBio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Seller bio must not exceed 1000 characters'),

  body('preferredMeetupLocation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Meetup location must not exceed 200 characters'),

  body('shippingAvailable')
    .optional()
    .isBoolean()
    .withMessage('Shipping available must be a boolean'),

  body('shippingFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping fee must be a positive number'),

  validate,
];

// validate user id param
export const userIdValidator = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),

  validate,
];

export default {
  updateProfileValidator,
  updateSellerInfoValidator,
  userIdValidator,
};