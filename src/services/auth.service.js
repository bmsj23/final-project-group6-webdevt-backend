import { OAuth2Client } from 'google-auth-library';
import config from '../config/config.js';
import User from '../models/User.model.js';
import { generateTokenPair } from '../utils/tokenUtils.js';
import AppError from '../utils/AppError.js';

const googleClient = new OAuth2Client(config.google.clientId);

// check if email is in admin allowlist from environment variable
const isAdminAllowed = (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  return envAdmins.includes(normalizedEmail);
};

// verify google oauth token and get user info
// param {string} token - Google OAuth token
// returns {Object} user info from Google

export const verifyGoogleToken = async (token) => {
  try {

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();

    // validate email domain
    if (!payload.email.endsWith(config.allowedEmailDomain)) {
      throw new AppError(
        `Only ${config.allowedEmailDomain} email addresses are allowed`,
        403
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      profilePicture: payload.picture,
    };
  } catch (error) {

    if (error instanceof AppError) throw error;
    throw new AppError('Invalid Google token', 401);
  }
};

// login or register user with google oauth
// param {string} googleToken - Google OAuth token
// returns {Object} user data and tokens

export const googleAuth = async (googleToken) => {
  // verify google token
  const googleUserInfo = await verifyGoogleToken(googleToken);

  // check if user exists
  let user = await User.findByGoogleId(googleUserInfo.googleId);

  if (!user) {
    // check if email already exists
    const existingUser = await User.findByEmail(googleUserInfo.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    const shouldBeAdmin = isAdminAllowed(googleUserInfo.email);

    // create new user
    user = await User.create({
      googleId: googleUserInfo.googleId,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      profilePicture: googleUserInfo.profilePicture,
      isActive: true,
      role: shouldBeAdmin ? 'admin' : 'user',
    });
  } else {
    // update profile picture and last login for existing users
    user.profilePicture = googleUserInfo.profilePicture;
    user.lastLogin = new Date();

    if (user.role !== 'admin') {
      const shouldBeAdmin = isAdminAllowed(user.email);
      if (shouldBeAdmin) {
        user.role = 'admin';
      }
    }

    await user.save();
  }

  // check if user is suspended
  if (user.isSuspended) {
    throw new AppError(
      `Account suspended: ${user.suspensionReason || 'Contact admin for details'}`,
      403
    );
  }

  const { accessToken, refreshToken } = generateTokenPair(user._id);

  return {
    user: user.getFullProfile(),
    accessToken,
    refreshToken,
  };
};

// refresh access token using refresh token
// param {string} refreshToken - refresh token
// returns {Object} new access token

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  try {

    const { verifyRefreshToken, generateAccessToken } = await import('../utils/tokenUtils.js');
    const decoded = verifyRefreshToken(refreshToken);

    // check if user exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    const newAccessToken = generateAccessToken(user._id);

    return {
      accessToken: newAccessToken,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid refresh token', 401);
  }
};

// logout user (client should delete tokens)
// param {string} userId - user id
// returns {Object} success message

export const logout = async (userId) => {

  return {
    message: 'Logged out successfully',
  };
};

// get current user profile
// param {string} userId - user id
// returns {Object} user profile

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user.getFullProfile();
};

// verify if user has required role
// param {string} userId - user id
// param {string} requiredRole - required role
// returns {boolean} has role

export const verifyRole = async (userId, requiredRole) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  return true;
};

export default {
  verifyGoogleToken,
  googleAuth,
  refreshAccessToken,
  logout,
  getCurrentUser,
  verifyRole,
};