import express from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// all routes are protected
router.use(authenticate);

// route   POST /api/upload/profile
// desc    upload profile picture
// access  private
router.post('/profile', upload.single('image'), uploadController.uploadProfilePicture);

// route   POST /api/upload/single
// desc    upload single image
// access  private
router.post('/single', upload.single('image'), uploadController.uploadSingleImage);

// route   POST /api/upload/multiple
// desc    upload multiple images
// access  private
router.post('/multiple', upload.array('images', 5), uploadController.uploadMultipleImages);

// route   DELETE /api/upload
// desc    delete image from cloudinary
// access  private
router.delete('/', uploadController.deleteImage);

export default router;