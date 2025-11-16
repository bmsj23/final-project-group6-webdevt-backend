import Order from '../models/Order.model.js';
import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import AppError from '../utils/AppError.js';
import { sendNewOrderEmail, sendOrderStatusEmail } from '../utils/emailService.js';


// create order from cart
// param {string} userId - buyer user ID
// param {Object} orderData - order details
// returns {Object} created order

export const createOrder = async (userId, orderData) => {
  const {
    items, // array of { product, quantity }
    deliveryMethod,
    deliveryAddress,
    meetupLocation,
    paymentMethod,
  } = orderData;

  if (!items || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  // validate delivery method and address/location
  if (deliveryMethod === 'shipping' && !deliveryAddress?.fullAddress) {
    throw new AppError('Delivery address is required for shipping', 400);
  }

  if (deliveryMethod === 'meetup' && !meetupLocation) {
    throw new AppError('Meetup location is required for meetup', 400);
  }

  // prepare order items with product details
  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await Product.findById(item.product);

    if (!product) {
      throw new AppError(`Product ${item.product} not found`, 404);
    }

    if (product.status !== 'active') {
      throw new AppError(`Product "${product.name}" is not available`, 400);
    }

    if (product.stock < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`,
        400
      );
    }

    // check if seller allows shipping if delivery method is shipping
    if (deliveryMethod === 'shipping') {
      const seller = await User.findById(product.seller);
      if (!seller.sellerInfo.allowsShipping) {
        throw new AppError(
          `Seller of "${product.name}" does not offer shipping`,
          400
        );
      }
    }

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    orderItems.push({
      product: product._id,
      seller: product.seller,
      quantity: item.quantity,
      price: product.price,
      productName: product.name,
      productImage: product.images?.[0] || '',
    });

    // decrement product stock and increment order count
    await product.decrementStock(item.quantity);
    await Product.findByIdAndUpdate(product._id, { $inc: { orderCount: 1 } });
  }

  // calculate shipping fee (mock logic)
  const shippingFee = deliveryMethod === 'shipping' ? 50 : 0;
  totalAmount += shippingFee;

  // create order
  const order = await Order.create({
    buyer: userId,
    items: orderItems,
    totalAmount,
    shippingFee,
    deliveryMethod,
    meetupLocation: deliveryMethod === 'meetup' ? meetupLocation : undefined,
    deliveryAddress: deliveryMethod === 'shipping' ? deliveryAddress : undefined,
    paymentMethod,
    status: 'pending',
  });

  // clear cart items that were ordered
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    for (const item of items) {
      await cart.removeItem(item.product);
    }
  }

  // send email notifications to sellers
  const sellerIds = [...new Set(orderItems.map(item => item.seller.toString()))];
  for (const sellerId of sellerIds) {
    const seller = await User.findById(sellerId);
    if (seller && seller.email) {
      try {
        await sendNewOrderEmail(seller.email, order.orderNumber, seller.name);
      } catch (emailError) {
        console.error('failed to send order email to seller:', emailError.message);
      }
    }
  }

  await order.populate([
    { path: 'buyer', select: 'name email contactNumber profilePicture' },
    { path: 'items.product', select: 'name images' },
    { path: 'items.seller', select: 'name email contactNumber profilePicture' },
  ]);

  return order;
};


// get order by ID
// param {string} orderId - order ID
// param {string} userId - user id (for authorization)
// returns {Object} order details

export const getOrderById = async (orderId, userId) => {
  const order = await Order.findById(orderId)
    .populate('buyer', 'name email contactNumber profilePicture')
    .populate('items.product', 'name images category')
    .populate('items.seller', 'name email contactNumber profilePicture sellerInfo');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // check if user is buyer or seller
  const isBuyer = order.buyer._id.toString() === userId;
  const isSeller = order.items.some(
    item => item.seller._id.toString() === userId
  );

  if (!isBuyer && !isSeller) {
    throw new AppError('You do not have access to this order', 403);
  }

  return order;
};


// get user's orders (as buyer)
// param {string} userId - user id
// param {Object} filters - filter options
// returns {Object} orders and pagination

export const getUserOrders = async (userId, filters = {}) => {
  const { status, page = 1, limit = 20 } = filters;

  const query = { buyer: userId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('items.product', 'name images')
    .populate('items.seller', 'name profilePicture sellerInfo email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments(query);

  return {
    orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
    },
  };
};


// get seller's orders
// param {string} sellerId - seller user ID
// param {Object} filters - filter options
// returns {Object} orders and pagination

export const getSellerOrders = async (sellerId, filters = {}) => {
  const { status, page = 1, limit = 20 } = filters;

  const query = { 'items.seller': sellerId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('buyer', 'name contactNumber profilePicture email')
    .populate('items.product', 'name images')
    .populate('items.seller', 'name profilePicture sellerInfo email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments(query);

  return {
    orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
    },
  };
};


// update order status
// param {string} orderId - order ID
// param {string} userId - user id (seller or admin)
// param {string} newStatus - new status
// param {string} note - optional note
// returns {Object} updated order

export const updateOrderStatus = async (orderId, userId, newStatus, note = '') => {
  const order = await Order.findById(orderId)
    .populate('buyer', 'email name');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // verify user is seller of items in order
  const isSeller = order.items.some(
    item => item.seller.toString() === userId
  );

  if (!isSeller) {
    throw new AppError('Only the seller can update order status', 403);
  }

  // validate status transition
  const validTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
    ready_for_pickup: ['completed', 'cancelled'],
    out_for_delivery: ['completed', 'cancelled'],
  };

  if (!validTransitions[order.status]?.includes(newStatus)) {
    throw new AppError(
      `Cannot change status from ${order.status} to ${newStatus}`,
      400
    );
  }

  await order.updateStatus(newStatus, userId, note);

  // send email notification to buyer
  if (order.buyer.email) {
    try {
      await sendOrderStatusEmail(
        order.buyer.email,
        order.orderNumber,
        newStatus,
        order.buyer.name
      );
    } catch (emailError) {
      console.error('failed to send status update email:', emailError.message);
    }
  }

  // update seller stats if completed
  if (newStatus === 'completed') {
    for (const item of order.items) {
      const seller = await User.findById(item.seller);
      if (seller) {
        await seller.incrementSales(item.price * item.quantity);
      }
    }
  }

  return order;
};


// cancel order
// param {string} orderId - order ID
// param {string} userId - user ID
// param {string} reason - cancellation reason
// returns {Object} cancelled order

export const cancelOrder = async (orderId, userId, reason) => {
  const order = await Order.findById(orderId)
    .populate('buyer', 'email name')
    .populate('items.product');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // check if user can cancel
  const isBuyer = order.buyer._id.toString() === userId;
  const isSeller = order.items.some(
    item => item.seller.toString() === userId
  );

  if (!isBuyer && !isSeller) {
    throw new AppError('You cannot cancel this order', 403);
  }

  if (!order.canBeCancelled()) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  // restore product stock
  for (const item of order.items) {
    if (item.product) {
      await item.product.incrementStock(item.quantity);
    }
  }

  await order.cancelOrder(userId, reason);

  // send email notification
  if (order.buyer.email) {
    try {
      await sendOrderStatusEmail(
        order.buyer.email,
        order.orderNumber,
        'cancelled',
        order.buyer.name
      );
    } catch (emailError) {
      console.error('failed to send cancellation email:', emailError.message);
    }
  }

  return order;
};


// get order statistics
// param {string} userId - user id (optional, for seller stats)
// returns {Object} order statistics

export const getOrderStats = async (userId = null) => {
  let stats;

  if (userId) {
    // seller stats
    stats = await Order.aggregate([
      { $match: { 'items.seller': userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);
  } else {
    // overall stats
    stats = await Order.getOrderStats();
  }

  return stats;
};

export default {
  createOrder,
  getOrderById,
  getUserOrders,
  getSellerOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
};