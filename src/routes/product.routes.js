import express from 'express';
import * as productController from '../controllers/product.controller.js';
import * as productValidator from '../validators/product.validator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// all routes require authentication (dlsl students only)
router.use(authenticate);

// route   GET /api/products/my/listings
// desc    get current user's products
// access  private
router.get('/my/listings', productController.getMyListings);

// route   GET /api/products/featured
// desc    get featured products
// access  private
router.get('/featured', productController.getFeaturedProducts);

// route   GET /api/products/categories/counts
// desc    get product categories with counts
// access  private
router.get('/categories/counts', productController.getCategoryCounts);

// route   GET /api/products/trending
// desc    get trending products
// access  private
router.get('/trending', productController.getTrendingProducts);

// route   GET /api/products/search
// desc    search products
// access  private
router.get('/search', productValidator.searchValidator, productController.searchProducts);

// route   GET /api/products/:productId/similar
// desc    get similar products
// access  private
router.get('/:productId/similar', productValidator.productIdValidator, productController.getSimilarProducts);

// route   GET /api/products
// desc    get all products with filters
// access  private
router.get('/', productController.getAllProducts);

// route   POST /api/products
// desc    create new product
// access  private
router.post('/', productValidator.createProductValidator, productController.createProduct);

// route   GET /api/products/:productId
// desc    get single product by id
// access  private
router.get('/:productId', productValidator.productIdValidator, productController.getProduct);

// route   PUT /api/products/:productId
// desc    update product
// access  private (owner only)
router.put('/:productId', productValidator.productIdValidator, productValidator.updateProductValidator, productController.updateProduct);

// route   DELETE /api/products/:productId
// desc    delete product
// access  private (owner only)
router.delete('/:productId', productValidator.productIdValidator, productController.deleteProduct);

// route   PATCH /api/products/:productId/status
// desc    update product status
// access  private (owner only)
router.patch('/:productId/status', productValidator.productIdValidator, productValidator.updateStatusValidator, productController.updateProductStatus);

// route   POST /api/products/:productId/view
// desc    increment product view count
// access  private
router.post('/:productId/view', productValidator.productIdValidator, productController.incrementProductView);

export default router;