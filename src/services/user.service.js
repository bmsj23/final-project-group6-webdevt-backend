import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import AppError from '../utils/AppError.js';


// get user by ID
// param {string} userId - user id
// returns {Object} user data

export const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user.getPublicProfile();
};


// update user profile
// param {string} userId - user id
// param {Object} updateData - data to update
// returns {Object} updated user

export const updateProfile = async (userId, updateData) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // check username uniqueness if updating username
  if (updateData.username && updateData.username !== user.username) {
    const existingUser = await User.findOne({ 
      username: updateData.username,
      _id: { $ne: userId }
    });
    
    if (existingUser) {
      throw new AppError('Username is already taken', 400);
    }
  }

  // fields that can be updated
  const allowedUpdates = [
    'name',
    'username',
    'studentNumber',
    'contactNumber',
    'campusAddress',
    'profilePicture',
  ];

  // update only allowed fields
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  await user.save();

  return user.getFullProfile();
};


// update seller information
// param {string} userId - user id
// param {Object} sellerData - seller info data
// returns {Object} updated user

export const updateSellerInfo = async (userId, sellerData) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // mark user as seller when they register/update seller info
  user.isSeller = true;

  // update seller info
  if (sellerData.bio !== undefined) {
    user.sellerInfo.bio = sellerData.bio;
  }

  if (sellerData.allowsShipping !== undefined) {
    user.sellerInfo.allowsShipping = sellerData.allowsShipping;
  }

  await user.save();

  return user.getFullProfile();
};


// get seller profile with products
// param {string} sellerId - seller user ID
// returns {Object} seller profile with products

export const getSellerProfile = async (sellerId) => {
  const seller = await User.findById(sellerId);

  if (!seller) {
    throw new AppError('Seller not found', 404);
  }

  // get active products
  const products = await Product.findBySeller(sellerId, 'active');

  return {
    ...seller.getPublicProfile(),
    products,
  };
};


// get all users (admin only)
// param {Object} filters - filter options
// returns {Array} list of users

export const getAllUsers = async (filters = {}) => {
  const { role, isActive, isSuspended, page = 1, limit = 20 } = filters;

  const query = {};

  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive;
  if (isSuspended !== undefined) query.isSuspended = isSuspended;

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('-__v')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasMore: page * limit < total,
    },
  };
};


// suspend user (admin only)
// param {string} userId - user id to suspend
// param {string} reason - suspension reason
// returns {Object} updated user

export const suspendUser = async (userId, reason) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Cannot suspend admin users', 403);
  }

  await user.suspend(reason);

  return user.getPublicProfile();
};


// activate user (admin only)
// param {string} userId - user id to activate
// returns {Object} updated user

export const activateUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.activate();

  return user.getPublicProfile();
};


// delete user account
// param {string} userId - user id
// returns {Object} success message

export const deleteAccount = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // check for active orders or products
  const activeProducts = await Product.findBySeller(userId, 'active');
  if (activeProducts.length > 0) {
    throw new AppError(
      'Cannot delete account with active products. Please deactivate or delete them first.',
      400
    );
  }

  const activeOrders = await Order.find({
    $or: [
      { buyer: userId },
      { 'items.seller': userId },
    ],
    status: { $in: ['pending', 'processing', 'ready_for_pickup', 'out_for_delivery'] },
  });

  if (activeOrders.length > 0) {
    throw new AppError(
      'Cannot delete account with active orders. Please complete or cancel them first.',
      400
    );
  }

  // soft delete by deactivating
  user.isActive = false;
  await user.save();

  return {
    message: 'Account deleted successfully',
  };
};


// search users (admin only)
// param {string} searchTerm - search term
// param {Object} options - search options
// returns {Array} matching users

export const searchUsers = async (searchTerm, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = {
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { username: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { studentNumber: { $regex: searchTerm, $options: 'i' } },
    ],
  };

  const users = await User.find(query)
    .select('-__v')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
    },
  };
};

export default {
  getUserById,
  updateProfile,
  updateSellerInfo,
  getSellerProfile,
  getAllUsers,
  suspendUser,
  activateUser,
  deleteAccount,
  searchUsers,
};