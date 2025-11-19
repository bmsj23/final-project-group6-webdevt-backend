import asyncHandler from '../utils/asyncHandler.js';
import mongoose from 'mongoose';
import Review from '../models/Review.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import { successResponse } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { sendNewReviewEmail } from '../utils/emailService.js';

// get current user's reviews

export const getMyReviews = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { page, limit } = req.query;

  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);

  const reviews = await Review.find({ buyer: buyerId })
    .populate('product', 'name images seller')
    .populate('seller', 'name email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 20)
    .skip(skip);

  const total = await Review.countDocuments({ buyer: buyerId });

  successResponse(res, {
    reviews,
    pagination: {
      currentPage: parseInt(page) || 1,
      totalPages: Math.ceil(total / (parseInt(limit) || 20)),
      totalReviews: total,
    },
  }, 'Your reviews retrieved successfully', 200);
});

// get reviews for product

export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page, limit, rating } = req.query;

  const productObjectId = new mongoose.Types.ObjectId(productId);

  const query = { product: productObjectId };
  if (rating) query.rating = parseInt(rating);

  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);

  const reviews = await Review.find(query)
    .populate('buyer', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 20)
    .skip(skip);

  const total = await Review.countDocuments(query);

  // get average rating
  const avgRating = await Review.getAverageRating(productObjectId);

  // get rating distribution
  const ratingDistribution = await Review.aggregate([
    { $match: { product: productObjectId } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ]);

  // create array with counts for each rating (1-5 stars)
  const distribution = [0, 0, 0, 0, 0];
  ratingDistribution.forEach(({ _id, count }) => {
    if (_id >= 1 && _id <= 5) {
      distribution[_id - 1] = count;
    }
  });

  successResponse(res, {
    reviews,
    averageRating: avgRating.averageRating,
    totalReviews: avgRating.totalReviews,
    ratingDistribution: distribution,
    pagination: {
      currentPage: parseInt(page) || 1,
      totalPages: Math.ceil(total / (parseInt(limit) || 20)),
      totalReviews: total,
    },
  }, 'Product reviews retrieved successfully', 200);
});

// create review (must have completed order)

export const createReview = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { productId, orderId, rating, reviewText, images } = req.body;

  // verify order exists and is completed
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.buyer.toString() !== buyerId) {
    throw new AppError('You can only review your own orders', 403);
  }

  if (order.status !== 'completed') {
    throw new AppError('You can only review completed orders', 400);
  }

  // verify product is in order
  const orderItem = order.items.find(
    (item) => item.product.toString() === productId
  );

  if (!orderItem) {
    throw new AppError('Product not found in this order', 404);
  }

  // check if review already exists
  const existingReview = await Review.findOne({
    product: productId,
    buyer: buyerId,
    order: orderId,
  });

  if (existingReview) {
    throw new AppError('You have already reviewed this product', 400);
  }

  // create review
  const review = await Review.create({
    product: productId,
    seller: orderItem.seller,
    buyer: buyerId,
    order: orderId,
    rating,
    reviewText,
    images: images || [],
  });

  // update product rating
  const product = await Product.findById(productId);
  await product.updateRating();

  // update seller rating
  const seller = await User.findById(orderItem.seller);
  const sellerRating = await Review.getSellerRating(orderItem.seller);
  await seller.updateSellerRating(sellerRating.averageRating);

  // send email notification to seller about new review
  try {
    const buyer = await User.findById(buyerId);

    if (seller && seller.email && buyer) {
      await sendNewReviewEmail(
        seller.email,
        product.name,
        rating,
        reviewText,
        buyer.name
      );
    }
  } catch (emailError) {
    console.error('Failed to send review notification email:', emailError);
    // don't throw error - review was created successfully even if email fails
  }

  await review.populate([
    { path: 'buyer', select: 'name profilePicture' },
    { path: 'product', select: 'name images' },
  ]);

  successResponse(res, review, 'Review created successfully', 201);
});

// add seller response to review


export const addSellerResponse = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;
  const { reviewId } = req.params;
  const { responseText } = req.body;

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.seller.toString() !== sellerId) {
    throw new AppError('You can only respond to reviews on your products', 403);
  }

  await review.addSellerResponse(responseText);

  successResponse(res, review, 'Response added successfully', 200);
});

// mark review as helpful

export const markReviewHelpful = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  await review.incrementHelpful();

  successResponse(res, review, 'Review marked as helpful', 200);
});

export const updateReview = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { reviewId } = req.params;
  const { rating, reviewText, images } = req.body;

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.buyer.toString() !== buyerId) {
    throw new AppError('You can only update your own reviews', 403);
  }

  // update review fields
  review.rating = rating;
  review.reviewText = reviewText;
  if (images !== undefined) {
    review.images = images;
  }

  await review.save();

  // update product rating
  const product = await Product.findById(review.product);
  await product.updateRating();

  // update seller rating
  const sellerRating = await Review.getSellerRating(review.seller);
  const seller = await User.findById(review.seller);
  await seller.updateSellerRating(sellerRating.averageRating);

  await review.populate([
    { path: 'buyer', select: 'name profilePicture' },
    { path: 'product', select: 'name images' },
  ]);

  successResponse(res, review, 'Review updated successfully', 200);
});

export const deleteReview = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.buyer.toString() !== buyerId) {
    throw new AppError('You can only delete your own reviews', 403);
  }

  const productId = review.product;
  const sellerId = review.seller;

  await review.deleteOne();

  // update product rating
  const product = await Product.findById(productId);
  if (product) {
    await product.updateRating();
  }

  // update seller rating
  const sellerRating = await Review.getSellerRating(sellerId);
  const seller = await User.findById(sellerId);
  if (seller) {
    await seller.updateSellerRating(sellerRating.averageRating);
  }

  successResponse(res, null, 'Review deleted successfully', 200);
});

export default {
  getMyReviews,
  getProductReviews,
  createReview,
  addSellerResponse,
  markReviewHelpful,
  updateReview,
  deleteReview,
};