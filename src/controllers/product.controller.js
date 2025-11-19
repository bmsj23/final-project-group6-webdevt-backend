import asyncHandler from '../utils/asyncHandler.js';
import * as productService from '../services/product.service.js';
import { successResponse } from '../utils/response.js';

// get all products with filters

export const getAllProducts = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    condition: req.query.condition,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    search: req.query.search,
    status: req.query.status || 'active',
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await productService.getAllProducts(filters);

  successResponse(res, result, 'Products retrieved successfully', 200);
});

// get single product by id

export const getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const incrementView = req.query.incrementView === 'true';
  const userId = req.user?.id || null;

  const product = await productService.getProductById(productId, incrementView, userId);

  successResponse(res, product, 'Product retrieved successfully', 200);
});

// create new product

export const createProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;
  const productData = req.body;

  const product = await productService.createProduct(sellerId, productData);

  successResponse(res, product, 'Product created successfully', 201);
});

// update product

export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const sellerId = req.user.id;
  const updateData = req.body;

  const product = await productService.updateProduct(productId, sellerId, updateData);

  successResponse(res, product, 'Product updated successfully', 200);
});

// delete product

export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const sellerId = req.user.id;

  const result = await productService.deleteProduct(productId, sellerId);

  successResponse(res, result, 'Product deleted successfully', 200);
});

// get current user's products

export const getMyListings = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;
  const { page, limit, status } = req.query;

  const result = await productService.getSellerProducts(sellerId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
  });

  successResponse(res, result, 'Your listings retrieved successfully', 200);
});

// update product status

export const updateProductStatus = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const sellerId = req.user.id;
  const { status } = req.body;

  const product = await productService.updateProduct(productId, sellerId, { status });

  successResponse(res, product, 'Product status updated successfully', 200);
});

// search products


export const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const options = {
    category: req.query.category,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await productService.searchProducts(q, options);

  successResponse(res, result, 'Search results retrieved successfully', 200);
});

// get featured products

export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const products = await productService.getFeaturedProducts({
    limit: parseInt(limit) || 10,
  });

  successResponse(res, products, 'Featured products retrieved successfully', 200);
});

// get product categories with counts

export const getCategoryCounts = asyncHandler(async (req, res) => {
  const counts = await productService.getCategoryCounts();

  successResponse(res, counts, 'Category counts retrieved successfully', 200);
});

// get similar products

export const getSimilarProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  const similar = await productService.getSimilarProducts(productId, limit);

  successResponse(res, similar, 'Similar products retrieved successfully', 200);
});

// get trending products

export const getTrendingProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const daysBack = parseInt(req.query.days) || 7;

  const trending = await productService.getTrendingProducts({ limit, daysBack });

  successResponse(res, trending, 'Trending products retrieved successfully', 200);
});

// increment product view count

export const incrementProductView = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const product = await productService.incrementProductView(productId, userId);

  successResponse(res, { views: product.views }, 'Product view incremented successfully', 200);
});

export default {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyListings,
  updateProductStatus,
  searchProducts,
  getFeaturedProducts,
  getCategoryCounts,
  getSimilarProducts,
  getTrendingProducts,
  incrementProductView,
};