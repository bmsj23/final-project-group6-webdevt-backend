import asyncHandler from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';
import * as productService from '../services/product.service.js';
import * as orderService from '../services/order.service.js';
import Report from '../models/Report.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import { successResponse } from '../utils/response.js';
import AppError from '../utils/AppError.js';

// get all users

export const getAllUsers = asyncHandler(async (req, res) => {
  const filters = {
    role: req.query.role,
    isActive: req.query.isActive,
    isSuspended: req.query.isSuspended,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await userService.getAllUsers(filters);

  successResponse(res, result, 'Users retrieved successfully', 200);
});

// suspend user account

export const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await userService.suspendUser(userId, reason);

  successResponse(res, user, 'User suspended successfully', 200);
});

// activate user account

export const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await userService.activateUser(userId);

  successResponse(res, user, 'User activated successfully', 200);
});

// delete user

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await userService.deleteAccount(userId);

  successResponse(res, result, 'User deleted successfully', 200);
});

// make user admin

export const makeAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.role = 'admin';
  await user.save();

  successResponse(res, user.getPublicProfile(), 'User made admin successfully', 200);
});

// get all products (admin view)

export const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    status: req.query.status,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 100,
  };

  if (!req.query.status) {
    delete filters.status;
  }

  const result = await productService.getAllProducts(filters);

  successResponse(res, result, 'Products retrieved successfully', 200);
});

// delete any product

export const deleteProductAdmin = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  product.status = 'deleted';
  await product.save();

  successResponse(res, null, 'Product deleted successfully', 200);
});

// get all orders

export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const query = {};
  if (status) query.status = status;

  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);

  const orders = await Order.find(query)
    .populate('buyer', 'name email profilePicture')
    .populate('items.seller', 'name email profilePicture')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 20)
    .skip(skip);

  const total = await Order.countDocuments(query);

  successResponse(res, {
    orders,
    pagination: {
      currentPage: parseInt(page) || 1,
      totalPages: Math.ceil(total / (parseInt(limit) || 20)),
      totalOrders: total,
    },
  }, 'Orders retrieved successfully', 200);
});

// get all reports

export const getAllReports = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const query = {};
  if (status) query.status = status;

  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);

  const reports = await Report.find(query)
    .populate('reporter', 'name email')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 20)
    .skip(skip);

  // populate reported entities based on type
  const populatedReports = await Promise.all(
    reports.map(async (report) => {
      const reportObj = report.toObject();

      if (report.reportedEntity.entityType === 'product') {
        const product = await Product.findById(report.reportedEntity.entityId)
          .populate('seller', 'name email')
          .lean();

        if (product) {
          reportObj.reportedProduct = product;
          reportObj.reportedUser = product.seller;
        }
      } else if (report.reportedEntity.entityType === 'user') {
        const user = await User.findById(report.reportedEntity.entityId)
          .select('name email')
          .lean();

        if (user) {
          reportObj.reportedUser = user;
        }
      }

      return reportObj;
    })
  );

  const total = await Report.countDocuments(query);

  successResponse(res, {
    reports: populatedReports,
    pagination: {
      currentPage: parseInt(page) || 1,
      totalPages: Math.ceil(total / (parseInt(limit) || 20)),
      totalReports: total,
    },
  }, 'Reports retrieved successfully', 200);
});

// get single report

export const getReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const report = await Report.findById(reportId)
    .populate('reporter', 'name email')
    .populate('reviewedBy', 'name');

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  successResponse(res, report, 'Report retrieved successfully', 200);
});

// update report status

export const updateReportStatus = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const { reportId } = req.params;
  const { status, notes } = req.body;

  const report = await Report.findById(reportId);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  await report.updateStatus(status, adminId, notes);

  successResponse(res, report, 'Report status updated successfully', 200);
});

// resolve report

export const resolveReport = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const { reportId } = req.params;
  const { resolution } = req.body;

  const report = await Report.findById(reportId);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  await report.resolve(adminId, resolution);

  successResponse(res, report, 'Report resolved successfully', 200);
});

// get marketplace statistics

export const getStatistics = asyncHandler(async (req, res) => {
  // get counts
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const totalProducts = await Product.countDocuments();
  const activeProducts = await Product.countDocuments({ status: 'active' });
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'pending' });

  // get order stats
  const orderStats = await Order.getOrderStats();

  // get report stats
  const reportStats = await Report.getStats();

  // get revenue (sum of completed orders)
  const revenue = await Order.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  successResponse(res, {
    users: {
      total: totalUsers,
      active: activeUsers,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      stats: orderStats,
    },
    reports: reportStats,
    revenue: revenue[0]?.total || 0,
  }, 'Statistics retrieved successfully', 200);
});

export default {
  getAllUsers,
  suspendUser,
  activateUser,
  deleteUser,
  makeAdmin,
  getAllProductsAdmin,
  deleteProductAdmin,
  getAllOrders,
  getAllReports,
  getReport,
  updateReportStatus,
  resolveReport,
  getStatistics,
};