import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import * as reviewValidator from '../validators/review.validator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// all routes require authentication (dlsl students only)
router.use(authenticate);

// route   GET /api/reviews/my
// desc    get current user's reviews
// access  private
router.get('/my', reviewController.getMyReviews);

// route   GET /api/reviews/product/:productId
// desc    get reviews for product
// access  private
router.get('/product/:productId', reviewValidator.productIdValidator, reviewController.getProductReviews);

// route   POST /api/reviews
// desc    create review (must have completed order)
// access  private
router.post('/', reviewValidator.createReviewValidator, reviewController.createReview);

// route   POST /api/reviews/:reviewId/response
// desc    add seller response to review
// access  private (seller only)
router.post('/:reviewId/response', reviewValidator.reviewIdValidator, reviewValidator.sellerResponseValidator, reviewController.addSellerResponse);

// route   POST /api/reviews/:reviewId/helpful
// desc    mark review as helpful
// access  private
router.post('/:reviewId/helpful', reviewValidator.reviewIdValidator, reviewController.markReviewHelpful);

// route   PUT /api/reviews/:reviewId
// desc    update review
// access  private (buyer only - can only update own review)
router.put('/:reviewId', reviewValidator.reviewIdValidator, reviewValidator.updateReviewValidator, reviewController.updateReview);
export default router;