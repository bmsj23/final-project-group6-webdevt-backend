import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';

// validate review creation
export const createReviewValidator = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('reviewText')
    .notEmpty()
    .withMessage('Review text is required')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Review text must be between 3 and 1000 characters'),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  validate,
];

// validate review id param
export const reviewIdValidator = [
  param('reviewId')
    .isMongoId()
    .withMessage('Invalid review ID'),

  validate,
];

// validate seller response
export const sellerResponseValidator = [
  body('responseText')
    .notEmpty()
    .withMessage('Response text is required')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Response text must be between 5 and 500 characters'),

  validate,
];

// validate product id param
export const productIdValidator = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),

  validate,
];

// validate review update
export const updateReviewValidator = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('reviewText')
    .notEmpty()
    .withMessage('Review text is required')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Review text must be between 3 and 1000 characters'),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  validate,
];

export default {
  createReviewValidator,
  reviewIdValidator,
  sellerResponseValidator,
  productIdValidator,
};