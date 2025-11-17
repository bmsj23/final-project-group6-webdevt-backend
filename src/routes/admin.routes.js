    import express from 'express';
    import * as adminController from '../controllers/admin.controller.js';
    import * as reportValidator from '../validators/report.validator.js';
    import * as userValidator from '../validators/user.validator.js';
    import * as productValidator from '../validators/product.validator.js';
    import { authenticate, restrictTo } from '../middleware/auth.js';

    const router = express.Router();

    // all routes are protected and restricted to admin
    router.use(authenticate);
    router.use(restrictTo('admin'));

    // user management
    // route   GET /api/admin/users
    // desc    get all users
    // access  private (admin only)
    router.get('/users', adminController.getAllUsers);

    // route   PATCH /api/admin/users/:userId/suspend
    // desc    suspend user account
    // access  private (admin only)
    router.patch('/users/:userId/suspend', userValidator.userIdValidator, adminController.suspendUser);

    // route   PATCH /api/admin/users/:userId/activate
    // desc    activate user account
    // access  private (admin only)
    router.patch('/users/:userId/activate', userValidator.userIdValidator, adminController.activateUser);

    // route   PATCH /api/admin/users/:userId/make-admin
    // desc    make user admin
    // access  private (admin only)
    router.patch('/users/:userId/make-admin', userValidator.userIdValidator, adminController.makeAdmin);

    // route   DELETE /api/admin/users/:userId
    // desc    delete user
    // access  private (admin only)
    router.delete('/users/:userId', userValidator.userIdValidator, adminController.deleteUser);

    // product management
    // route   GET /api/admin/products
    // desc    get all products (admin view)
    // access  private (admin only)
    router.get('/products', adminController.getAllProductsAdmin);

    // route   DELETE /api/admin/products/:productId
    // desc    delete any product
    // access  private (admin only)
    router.delete('/products/:productId', productValidator.productIdValidator, adminController.deleteProductAdmin);

    // order management
    // route   GET /api/admin/orders
    // desc    get all orders
    // access  private (admin only)
    router.get('/orders', adminController.getAllOrders);

    // report management
    // route   GET /api/admin/reports
    // desc    get all reports
    // access  private (admin only)
    router.get('/reports', adminController.getAllReports);

    // route   GET /api/admin/reports/:reportId
    // desc    get single report
    // access  private (admin only)
    router.get('/reports/:reportId', reportValidator.reportIdValidator, adminController.getReport);

    // route   PATCH /api/admin/reports/:reportId/status
    // desc    update report status
    // access  private (admin only)
    router.patch('/reports/:reportId/status', reportValidator.reportIdValidator, reportValidator.updateReportStatusValidator, adminController.updateReportStatus);

    // route   PUT /api/admin/reports/:reportId/resolve
    // desc    resolve report
    // access  private (admin only)
    router.put('/reports/:reportId/resolve', reportValidator.reportIdValidator, reportValidator.resolveReportValidator, adminController.resolveReport);

    // statistics
    // route   GET /api/admin/statistics
    // desc    get marketplace statistics
    // access  private (admin only)
    router.get('/statistics', adminController.getStatistics);

    export default router;