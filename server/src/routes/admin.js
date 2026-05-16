// src/routes/admin.js - 管理后台路由
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const adminController = require('../controllers/admin');
const { adminAuth, superAdminOnly } = require('../middleware/adminAuth');
const validate = require('../middleware/validate');

/**
 * 管理员登录
 * POST /api/admin/login
 */
router.post('/login',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  validate,
  adminController.login
);

/**
 * 获取管理员信息
 * GET /api/admin/info
 */
router.get('/info', adminAuth, adminController.getAdminInfo);

/**
 * 获取统计数据（首页）
 * GET /api/admin/dashboard
 */
router.get('/dashboard', adminAuth, adminController.getDashboard);

/**
 * 获取订单列表
 * GET /api/admin/order/list
 */
router.get('/order/list',
  adminAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'])
  ],
  validate,
  adminController.getOrderList
);

/**
 * 获取订单详情
 * GET /api/admin/order/detail
 */
router.get('/order/detail',
  adminAuth,
  [
    query('id').notEmpty().withMessage('订单ID不能为空')
  ],
  validate,
  adminController.getOrderDetail
);

/**
 * 完结订单（确认）
 * POST /api/admin/order/complete
 */
router.post('/order/complete',
  adminAuth,
  [
    body('orderId').notEmpty().withMessage('订单ID不能为空').isInt().withMessage('订单ID必须为整数')
  ],
  validate,
  adminController.completeOrder
);

/**
 * 拒绝订单
 * POST /api/admin/order/reject
 */
router.post('/order/reject',
  adminAuth,
  [
    body('orderId').notEmpty().withMessage('订单ID不能为空').isInt().withMessage('订单ID必须为整数'),
    body('failReason').optional().isLength({ max: 255 }).withMessage('拒绝原因不能超过255字')
  ],
  validate,
  adminController.rejectOrder
);

/**
 * 获取用户列表
 * GET /api/admin/user/list
 */
router.get('/user/list',
  adminAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 50 })
  ],
  validate,
  adminController.getUserList
);

/**
 * 获取用户详情
 * GET /api/admin/user/detail
 */
router.get('/user/detail',
  adminAuth,
  [
    query('id').notEmpty().withMessage('用户ID不能为空')
  ],
  validate,
  adminController.getUserDetail
);

// ========== 回收资产 ==========

/**
 * 获取回收资产汇总统计
 * GET /api/admin/assets/summary
 */
router.get('/assets/summary', adminAuth, adminController.getAssetSummary);

/**
 * 获取回收资产明细列表
 * GET /api/admin/assets/detail
 */
router.get('/assets/detail', adminAuth, adminController.getAssetDetail);

/**
 * 导出回收资产Excel
 * GET /api/admin/assets/export
 */
router.get('/assets/export', adminAuth, adminController.exportAssets);

/**
 * 获取卡券类型列表（供筛选下拉框使用）
 * GET /api/admin/card-types
 */
router.get('/card-types', adminAuth, adminController.getCardTypeList);

/**
 * 获取所有卡券类型列表（管理页面用，含已禁用）
 * GET /api/admin/card-types/all
 */
router.get('/card-types/all', adminAuth, adminController.getAllCardTypeList);

// ========== 已销售资产 ==========

/**
 * 获取已销售资产汇总统计
 * GET /api/admin/sold-assets/summary
 */
router.get('/sold-assets/summary', adminAuth, adminController.getSoldAssetSummary);

/**
 * 获取已销售资产明细列表
 * GET /api/admin/sold-assets/detail
 */
router.get('/sold-assets/detail', adminAuth, adminController.getSoldAssetDetail);

/**
 * 导出已销售资产Excel
 * GET /api/admin/sold-assets/export
 */
router.get('/sold-assets/export', adminAuth, adminController.exportSoldAssets);

// ========== 可销售资产 ==========

/**
 * 获取可销售资产汇总统计
 * GET /api/admin/available-assets/summary
 */
router.get('/available-assets/summary', adminAuth, adminController.getAvailableAssetSummary);

/**
 * 获取可销售资产明细列表
 * GET /api/admin/available-assets/detail
 */
router.get('/available-assets/detail', adminAuth, adminController.getAvailableAssetDetail);

/**
 * 导出可销售资产Excel
 * GET /api/admin/available-assets/export
 */
router.get('/available-assets/export', adminAuth, adminController.exportAvailableAssets);

/**
 * 获取买家订单列表
 * GET /api/admin/buy-order/list
 */
router.get('/buy-order/list', adminAuth, adminController.getBuyOrderList);

/**
 * 获取买家订单详情
 * GET /api/admin/buy-order/detail
 */
router.get('/buy-order/detail', adminAuth, adminController.getBuyOrderDetail);

/**
 * 更新卡券类型折扣率
 * POST /api/admin/card-type/update-discount
 */
router.post('/card-type/update-discount',
  adminAuth,
  [
    body('id').notEmpty().withMessage('卡券类型ID不能为空').isInt().withMessage('卡券类型ID必须为整数')
  ],
  validate,
  adminController.updateCardTypeDiscount
);

/**
 * 更新卡券类型图标
 * POST /api/admin/card-type/update-icon
 */
router.post('/card-type/update-icon',
  adminAuth,
  [
    body('id').notEmpty().withMessage('卡券类型ID不能为空').isInt().withMessage('卡券类型ID必须为整数')
  ],
  validate,
  adminController.updateCardTypeIcon
);

/**
 * 切换卡券类型状态
 * POST /api/admin/card-type/:id/toggle-status
 */
router.post('/card-type/:id/toggle-status', adminAuth, adminController.toggleCardTypeStatus);

/**
 * 删除卡券类型
 * DELETE /api/admin/card-type/:id
 */
router.delete('/card-type/:id', adminAuth, adminController.deleteCardType);

// ========== 卡产品管理 ==========

/**
 * 新增卡产品
 * POST /api/admin/card-product/create
 */
router.post('/card-product/create',
  adminAuth,
  [
    body('name').notEmpty().withMessage('请输入名称').isLength({ max: 100 }).withMessage('名称不能超过100字'),
    // cardTypeId和typeName至少提供一个
    body('cardTypeId').optional().isInt().withMessage('卡类型ID必须为整数'),
    body('typeName').optional().isLength({ max: 50 }).withMessage('类型名称不能超过50字')
  ],
  validate,
  adminController.createCardProduct
);

/**
 * 获取卡产品列表（支持筛选和分页）
 * GET /api/admin/card-products/all
 */
router.get('/card-products/all',
  adminAuth,
  [
    query('page').optional({ values: 'undefined' }).isInt({ min: 1 }).withMessage('page必须为正整数'),
    query('pageSize').optional({ values: 'undefined' }).isInt({ min: 1, max: 50 }).withMessage('pageSize必须为1-50的整数'),
    query('hasHotFaceValue').optional({ values: 'undefined' }).isInt({ min: 0, max: 1 }).withMessage('hasHotFaceValue只能为0或1'),
    query('hasSaleableFaceValue').optional({ values: 'undefined' }).isInt({ min: 0, max: 1 }).withMessage('hasSaleableFaceValue只能为0或1')
  ],
  validate,
  adminController.getAllCardProductList
);

/**
 * 更新卡产品折扣
 * POST /api/admin/card-product/update-discount
 */
router.post('/card-product/update-discount', adminAuth, adminController.updateCardProductDiscount);

/**
 * 切换卡产品状态
 * POST /api/admin/card-product/:id/toggle-status
 */
router.post('/card-product/:id/toggle-status', adminAuth, adminController.toggleCardProductStatus);

/**
 * 切换卡产品热门状态
 * POST /api/admin/card-product/:id/toggle-hot
 */
router.post('/card-product/:id/toggle-hot', adminAuth, adminController.toggleCardProductHot);

/**
 * 删除卡产品
 * DELETE /api/admin/card-product/:id
 */
router.delete('/card-product/:id', adminAuth, adminController.deleteCardProduct);

/**
 * 获取卡产品面值明细列表
 * GET /api/admin/card-product/:id/face-values
 */
router.get('/card-product/:id/face-values', adminAuth, adminController.getCardProductFaceValues);

/**
 * 批量保存卡产品面值明细
 * POST /api/admin/card-product/:id/face-values/batch-save
 */
router.post('/card-product/:id/face-values/batch-save', adminAuth, adminController.batchSaveCardProductFaceValues);

module.exports = router;