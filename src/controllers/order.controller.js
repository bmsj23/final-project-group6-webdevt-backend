import asyncHandler from '../utils/asyncHandler.js';
import * as orderService from '../services/order.service.js';
import { successResponse } from '../utils/response.js';

// create order from cart

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const orderData = req.body;

  const order = await orderService.createOrder(userId, orderData);

  successResponse(res, order, 'Order created successfully', 201);
});

// get user's orders (buyer + seller)

export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, page, limit, type } = req.query;

  let result;

  if (type === 'purchases') {
    result = await orderService.getUserOrders(userId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
  } else if (type === 'sales') {
    result = await orderService.getSellerOrders(userId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
  } else {
    // get both
    const purchases = await orderService.getUserOrders(userId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    const sales = await orderService.getSellerOrders(userId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    result = { purchases, sales };
  }

  successResponse(res, result, 'Orders retrieved successfully', 200);
});

// get single order

export const getOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  const order = await orderService.getOrderById(orderId, userId);

  successResponse(res, order, 'Order retrieved successfully', 200);
});

// update order status (seller only)

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  const { status, note } = req.body;

  const order = await orderService.updateOrderStatus(orderId, userId, status, note);

  successResponse(res, order, 'Order status updated successfully', 200);
});

// cancel order (buyer or seller)

export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await orderService.cancelOrder(orderId, userId, reason);

  successResponse(res, order, 'Order cancelled successfully', 200);
});

// get orders as buyer

export const getMyPurchases = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, page, limit } = req.query;

  const result = await orderService.getUserOrders(userId, {
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  successResponse(res, result, 'Purchases retrieved successfully', 200);
});

// get orders as seller

export const getMySales = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, page, limit } = req.query;

  const result = await orderService.getSellerOrders(userId, {
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  successResponse(res, result, 'Sales retrieved successfully', 200);
});

// get order statistics

export const getOrderStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const stats = await orderService.getOrderStats(userId);

  successResponse(res, stats, 'Order statistics retrieved successfully', 200);
});

// confirm order by buyer

export const confirmOrderByBuyer = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  const order = await orderService.confirmOrderByBuyer(orderId, userId);

  successResponse(res, order, 'Order confirmed successfully', 200);
});

export default {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getMyPurchases,
  getMySales,
  getOrderStats,
  confirmOrderByBuyer,
};