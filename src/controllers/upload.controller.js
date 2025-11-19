import asyncHandler from '../utils/asyncHandler.js';
import * as cloudinaryService from '../services/cloudinary.service.js';
import { successResponse } from '../utils/response.js';
import AppError from '../utils/AppError.js';

// upload profile picture

export const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const userId = req.user.id;
  const result = await cloudinaryService.uploadProfilePicture(req.file.buffer, userId);

  successResponse(res, result, 'Profile picture uploaded successfully', 200);
});

// upload single image

export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const userId = req.user.id;
  const { type } = req.body; // 'profile' or 'product'

  let result;

  if (type === 'profile') {
    result = await cloudinaryService.uploadProfilePicture(req.file.buffer, userId);
  } else {
    result = await cloudinaryService.uploadImage(req.file.buffer, {
      folder: `animomart/products/${userId}`,
    });
  }

  successResponse(res, result, 'Image uploaded successfully', 200);
});

// upload multiple images

export const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const userId = req.user.id;

  const results = await cloudinaryService.uploadProductImages(req.files, userId);

  successResponse(res, results, 'Images uploaded successfully', 200);
});

// delete image from cloudinary

export const deleteImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;

  const publicId = cloudinaryService.extractPublicId(imageUrl);

  if (!publicId) {
    throw new AppError('Invalid image URL', 400);
  }

  const result = await cloudinaryService.deleteImage(publicId);

  successResponse(res, result, 'Image deleted successfully', 200);
});

export default {
  uploadProfilePicture,
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
};