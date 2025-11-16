import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';

// validate order creation
export const createOrderValidator = [
  body('shippingAddress')
    .optional()
    .isObject()
    .withMessage('Shipping address must be an object'),

  body('shippingAddress.street')
    .if(body('shippingAddress').exists())
    .notEmpty()
    .withMessage('Street is required')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street must not exceed 200 characters'),

  body('shippingAddress.barangay')
    .if(body('shippingAddress').exists())
    .notEmpty()
    .withMessage('Barangay is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Barangay must not exceed 100 characters'),

  body('shippingAddress.city')
    .if(body('shippingAddress').exists())
    .notEmpty()
    .withMessage('City is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('shippingAddress.province')
    .if(body('shippingAddress').exists())
    .notEmpty()
    .withMessage('Province is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Province must not exceed 100 characters'),

  body('shippingAddress.zipCode')
    .if(body('shippingAddress').exists())
    .notEmpty()
    .withMessage('Zip code is required')
    .matches(/^\d{4}$/)
    .withMessage('Invalid zip code format'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['cash_on_meetup', 'cash_on_delivery', 'bank_transfer', 'gcash', 'maya'])
    .withMessage('Invalid payment method'),

  body('deliveryMethod')
    .notEmpty()
    .withMessage('Delivery method is required')
    .isIn(['meetup', 'shipping'])
    .withMessage('Invalid delivery method'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),

  validate,
];

// validate order id param
export const orderIdValidator = [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),

  validate,
];

// validate order status update
export const updateOrderStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['processing', 'ready-for-pickup', 'shipped', 'completed', 'cancelled'])
    .withMessage('Invalid status'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note must not exceed 500 characters'),

  validate,
];

// validate cancel order
export const cancelOrderValidator = [
  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),

  validate,
];

export default {
  createOrderValidator,
  orderIdValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
};