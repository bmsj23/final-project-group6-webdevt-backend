import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import AppError from '../utils/AppError.js';
import { getCategoryFilterQuery, isValidSubcategory } from '../utils/categoryUtils.js';
import { generateProductEmbedding } from './productEmbeddings.service.js';
import { findSimilarProducts } from '../utils/vectorUtils.js';


// create a new product
// param {string} sellerId - seller user ID
// param {Object} productData - product data
// returns {Object} created product

export const createProduct = async (sellerId, productData) => {
  // verify seller exists
  const seller = await User.findById(sellerId);
  if (!seller) {
    throw new AppError('Seller not found', 404);
  }

  // validate category is a valid subcategory (not a main category)
  if (productData.category && !isValidSubcategory(productData.category)) {
    throw new AppError(
      'Category must be a valid subcategory. Main categories are not accepted.',
      400
    );
  }

  // create product
  const product = await Product.create({
    ...productData,
    seller: sellerId,
  });

  try {
    product.embedding = await generateProductEmbedding(product);
    await product.save();
  } catch (error) {
    console.error('error generating embedding for new product:', error);
  }

  await product.populate('seller', 'name profilePicture sellerInfo');

  return product;
};


// get product by ID
// param {string} productId - product ID
// param {boolean} incrementView - whether to increment view count
// returns {Object} product data

export const getProductById = async (productId, incrementView = false) => {
  const product = await Product.findById(productId)
    .populate('seller', 'name username profilePicture sellerInfo contactNumber');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // increment views if requested
  if (incrementView && product.status === 'active') {
    await product.incrementViews();
  }

  // get seller's listings count
  if (product.seller) {
    const listingsCount = await Product.countDocuments({
      seller: product.seller._id,
      status: { $ne: 'deleted' },
    });

    // add listingsCount and rating to seller object
    const productObj = product.toObject();
    productObj.seller = {
      ...productObj.seller,
      listingsCount,
      rating: productObj.seller.sellerInfo?.averageRating || 0,
    };

    return productObj;
  }

  return product;
};


// update product
// param {string} productId - product ID
// param {string} sellerId - seller user ID
// param {Object} updateData - data to update
// returns {Object} updated product

export const updateProduct = async (productId, sellerId, updateData) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.toString() !== sellerId) {
    throw new AppError('You can only update your own products', 403);
  }

  // validate category if being updated
  if (updateData.category && !isValidSubcategory(updateData.category)) {
    throw new AppError(
      'Category must be a valid subcategory. Main categories are not accepted.',
      400
    );
  }

  // fields that can be updated
  const allowedUpdates = [
    'name',
    'description',
    'price',
    'stock',
    'images',
    'category',
    'condition',
    'shippingAvailable',
    'status',
  ];

  // update only allowed fields
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      product[field] = updateData[field];
    }
  });

  const relevantFields = ['name', 'description', 'category', 'condition'];
  const fieldsChanged = relevantFields.some(field => updateData[field] !== undefined);

  if (fieldsChanged) {
    try {
      product.embedding = await generateProductEmbedding(product);
    } catch (error) {
      console.error('error regenerating embedding for updated product:', error);
    }
  }

  await product.save();
  await product.populate('seller', 'name profilePicture');

  return product;
};


// delete product
// param {string} productId - product ID
// param {string} sellerId - seller user ID
// returns {Object} success message

export const deleteProduct = async (productId, sellerId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // verify ownership
  if (product.seller.toString() !== sellerId) {
    throw new AppError('You can only delete your own products', 403);
  }

  // soft delete by changing status
  product.status = 'deleted';
  await product.save();

  return {
    message: 'Product deleted successfully',
  };
};


// get all products with filters
// param {Object} filters - filter options
// returns {Object} products and pagination

export const getAllProducts = async (filters = {}) => {
  const {
    category,
    condition,
    minPrice,
    maxPrice,
    search,
    sellerId,
    status = 'active',
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const query = {};

  // apply filters
  if (status) query.status = status;

  // category filtering
  if (category) {
    const categoryFilter = getCategoryFilterQuery(category);
    if (categoryFilter === null) {
      throw new AppError('Invalid category provided', 400);
    }
    query.category = categoryFilter;
  }

  if (condition) query.condition = condition;
  if (sellerId) query.seller = sellerId;

  // price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
  }

  // text search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // pagination
  const skip = (page - 1) * limit;

  // sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const products = await Product.find(query)
    .populate('seller', '_id name profilePicture sellerInfo')
    .sort(sort)
    .limit(limit)
    .skip(skip);

  const total = await Product.countDocuments(query);

  return {
    products,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      hasMore: page * limit < total,
    },
  };
};


// get products by seller
// param {string} sellerId - seller user ID
// param {Object} options - filter options
// returns {Array} seller's products

export const getSellerProducts = async (sellerId, options = {}) => {
  const { status, page = 1, limit = 20 } = options;

  const query = { seller: sellerId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Product.countDocuments(query);

  return {
    products,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
    },
  };
};


// search products with full-text search
// param {string} searchTerm - search term
// param {Object} options - search options
// returns {Object} search results

export const searchProducts = async (searchTerm, options = {}) => {
  const { category, minPrice, maxPrice, page = 1, limit = 20 } = options;

  const searchOptions = {
    limit,
    skip: (page - 1) * limit,
    category,
    minPrice,
    maxPrice,
  };

  const products = await Product.searchProducts(searchTerm, searchOptions);

  return {
    products,
    searchTerm,
  };
};


// get featured/recommended products
// param {Object} options
// returns {Array} featured products

export const getFeaturedProducts = async (options = {}) => {
  const { limit = 10 } = options;

  // get products with high ratings and sales
  const products = await Product.find({
    status: 'active',
    stock: { $gt: 0 },
  })
    .populate('seller', 'name profilePicture')
    .sort({ totalSales: -1, averageRating: -1, views: -1 })
    .limit(limit);

  return products;
};


// get low stock products for seller
// param {string} sellerId - seller user ID
// param {number} threshold - stock threshold
// returns {Array} low stock products

export const getLowStockProducts = async (sellerId, threshold = 5) => {
  const products = await Product.find({
    seller: sellerId,
    status: 'active',
    stock: { $lte: threshold, $gt: 0 },
  }).sort({ stock: 1 });

  return products;
};


// update product stock
// param {string} productId - product ID
// param {number} quantity - quantity to add/remove
// param {string} operation - 'add' or 'remove'
// returns {Object} updated product

export const updateStock = async (productId, quantity, operation = 'add') => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (operation === 'add') {
    await product.incrementStock(quantity);
  } else if (operation === 'remove') {
    await product.decrementStock(quantity);
  } else {
    throw new AppError('Invalid operation. Use "add" or "remove"', 400);
  }

  return product;
};


// get product categories with counts
// returns {Array} categories with product counts grouped by main category

export const getCategoryCounts = async () => {
  const { getMainCategoryForSubcategory, getAllMainCategories } = await import('../utils/categoryUtils.js');

  // get all products with their subcategories
  const products = await Product.find({ status: 'active' }, { category: 1 });

  // initialize counts for all main categories
  const categoryCounts = {};
  getAllMainCategories().forEach(mainCat => {
    categoryCounts[mainCat] = 0;
  });

  // count products by mapping subcategories to main categories
  products.forEach(product => {
    const mainCategory = getMainCategoryForSubcategory(product.category);
    if (mainCategory) {
      categoryCounts[mainCategory]++;
    }
  });

  // convert to array format
  const counts = Object.entries(categoryCounts).map(([category, count]) => ({
    _id: category,
    count,
  }));

  // sort by count descending
  counts.sort((a, b) => b.count - a.count);

  return counts;
};

export default {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSellerProducts,
  searchProducts,
  getFeaturedProducts,
  getLowStockProducts,
  updateStock,
  getCategoryCounts,
};

export const getSimilarProducts = async (productId, limit = 10) => {
  const targetProduct = await Product.findById(productId).select('+embedding');

  if (!targetProduct) {
    throw new AppError('product not found', 404);
  }

  if (!targetProduct.embedding || targetProduct.embedding.length === 0) {
    throw new AppError('product does not have embedding generated', 400);
  }

  const allProducts = await Product.find({
    _id: { $ne: productId },
    embedding: { $exists: true, $ne: null },
    status: 'active',
    stock: { $gt: 0 }
  })
    .select('+embedding')
    .populate('seller', '_id name profilePicture sellerInfo');

  const similar = findSimilarProducts(targetProduct.embedding, allProducts, limit);

  const cleaned = similar.map(({ embedding, similarity, ...product }) => ({
    ...product,
    relevanceScore: similarity
  }));

  return cleaned;
};

export const getTrendingProducts = async ({ limit = 20, daysBack = 7 }) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const products = await Product.find({
    status: 'active',
    stock: { $gt: 0 },
    createdAt: { $gte: cutoffDate }
  }).populate('seller', '_id name profilePicture sellerInfo');

  const scored = products.map(product => {
    const daysOld = (Date.now() - product.createdAt) / (1000 * 60 * 60 * 24);
    const recencyMultiplier = Math.max(0.5, 1 - daysOld / 30);

    const score = (
      (product.views || 0) * 0.3 +
      (product.wishlistCount || 0) * 2.0 +
      (product.orderCount || 0) * 5.0 +
      (product.totalReviews || 0) * 3.0 +
      (product.averageRating || 0) * 1.5
    ) * recencyMultiplier;

    return { ...product.toObject(), trendingScore: score };
  });

  const trending = scored
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, limit)
    .map(({ trendingScore, ...product }) => product);

  return trending;
};

export const incrementProductView = async (productId) => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
};