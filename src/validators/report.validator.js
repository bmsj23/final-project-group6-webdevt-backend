import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';

// validate report creation
export const createReportValidator = [
  body('entityType')
    .notEmpty()
    .withMessage('Entity type is required')
    .isIn(['user', 'product', 'review', 'message'])
    .withMessage('Invalid entity type'),

  body('entityId')
    .notEmpty()
    .withMessage('Entity ID is required')
    .isMongoId()
    .withMessage('Invalid entity ID'),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isIn([
      'inappropriate_content',
      'scam_or_fraud',
      'counterfeit_product',
      'harassment',
      'spam',
      'other'
    ])
    .withMessage('Invalid reason'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),

  body('evidence')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 evidence files allowed'),

  body('evidence.*')
    .optional()
    .isURL()
    .withMessage('Invalid evidence URL'),

  validate,
];

// validate report id param
export const reportIdValidator = [
  param('reportId')
    .isMongoId()
    .withMessage('Invalid report ID'),

  validate,
];

// validate report status update
export const updateReportStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'under_review', 'resolved', 'dismissed'])
    .withMessage('Invalid status'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  validate,
];

// validate report resolution
export const resolveReportValidator = [
  body('resolution')
    .notEmpty()
    .withMessage('Resolution is required')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Resolution must be between 10 and 1000 characters'),

  validate,
];

export default {
  createReportValidator,
  reportIdValidator,
  updateReportStatusValidator,
  resolveReportValidator,
};