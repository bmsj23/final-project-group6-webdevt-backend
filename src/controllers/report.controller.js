import asyncHandler from '../utils/asyncHandler.js';
import Report from '../models/Report.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import { successResponse } from '../utils/response.js';
import AppError from '../utils/AppError.js';

// create report

export const createReport = asyncHandler(async (req, res) => {
  const reporterId = req.user.id;
  const { entityType, entityId, reason, description, evidence } = req.body;

  // check if user already reported this entity
  const hasReported = await Report.hasUserReported(reporterId, entityType, entityId);

  if (hasReported) {
    throw new AppError('You have already reported this', 400);
  }

  const report = await Report.create({
    reporter: reporterId,
    reportedEntity: {
      entityType,
      entityId,
    },
    reason,
    description,
    evidence: evidence || [],
  });

  await report.populate('reporter', 'name email');

  successResponse(res, report, 'Report submitted successfully', 201);
});

// get user's submitted reports

export const getMyReports = asyncHandler(async (req, res) => {
  const reporterId = req.user.id;
  const { page, limit, status } = req.query;

  const query = { reporter: reporterId };
  if (status) query.status = status;

  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);

  const reports = await Report.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 20)
    .skip(skip);

  // populate reported entities
  const populatedReports = await Promise.all(
    reports.map(async (report) => {
      const reportObj = report.toObject();
      
      if (report.reportedEntity.entityType === 'product') {
        const product = await Product.findById(report.reportedEntity.entityId)
          .populate('seller', 'name email')
          .select('name price images')
          .lean();
        
        if (product) {
          reportObj.reportedProduct = product;
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
  const userId = req.user.id;

  const report = await Report.findById(reportId)
    .populate('reporter', 'name email')
    .populate('reviewedBy', 'name');

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  // only reporter can view their own report (unless admin)
  if (report.reporter._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError('You do not have access to this report', 403);
  }

  successResponse(res, report, 'Report retrieved successfully', 200);
});

export default {
  createReport,
  getMyReports,
  getReport,
};