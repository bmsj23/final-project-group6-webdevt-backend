import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import * as orderValidator from '../validators/order.validator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// all routes are protected
router.use(authenticate);

// route   GET /api/orders/my
// desc    get user's orders (buyer + seller)
// access  private
router.get('/my', orderController.getMyOrders);

// route   GET /api/orders/purchases
// desc    get orders as buyer
// access  private
router.get('/purchases', orderController.getMyPurchases);

// route   GET /api/orders/sales
// desc    get orders as seller
// access  private
router.get('/sales', orderController.getMySales);

// route   GET /api/orders/stats
// desc    get order statistics
// access  private
router.get('/stats', orderController.getOrderStats);

// route   POST /api/orders
// desc    create order from cart
// access  private
router.post('/', orderValidator.createOrderValidator, orderController.createOrder);

// route   GET /api/orders/:orderId
// desc    get single order
// access  private
router.get('/:orderId', orderValidator.orderIdValidator, orderController.getOrder);

// route   PATCH /api/orders/:orderId/status
// desc    update order status (seller only)
// access  private
router.patch('/:orderId/status', orderValidator.orderIdValidator, orderValidator.updateOrderStatusValidator, orderController.updateOrderStatus);

// route   POST /api/orders/:orderId/cancel
// desc    cancel order (buyer or seller)
// access  private
router.post('/:orderId/cancel', orderValidator.orderIdValidator, orderValidator.cancelOrderValidator, orderController.cancelOrder);

// route   POST /api/orders/:orderId/confirm-receipt
// desc    confirm order receipt by buyer
// access  private (buyer only)
router.post('/:orderId/confirm-receipt', orderValidator.orderIdValidator, orderController.confirmOrderByBuyer);

export default router;