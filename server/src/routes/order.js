// src/routes/order.js - 订单路由
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const orderController = require('../controllers/order');
const { auth, verified } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * 创建订单
 * POST /api/order/create
 */
router.post('/create',
  auth,
  verified,
  [
    body('cardTypeId').notEmpty().withMessage('卡券类型不能为空'),
    body('faceValue').isFloat({ min: 1 }).withMessage('面值必须大于0'),
    body('cardNo').notEmpty().withMessage('卡号不能为空'),
    body('cardPwd').notEmpty().withMessage('卡密不能为空')
  ],
  validate,
  orderController.create
);

/**
 * 订单列表
 * GET /api/order/list
 */
router.get('/list',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'])
  ],
  validate,
  orderController.list
);

/**
 * 订单详情
 * GET /api/order/detail
 */
router.get('/detail',
  auth,
  [
    query('id').notEmpty().withMessage('订单ID不能为空')
  ],
  validate,
  orderController.detail
);

/**
 * 取消订单
 * POST /api/order/cancel
 */
router.post('/cancel',
  auth,
  [
    body('orderId').notEmpty().withMessage('订单ID不能为空')
  ],
  validate,
  orderController.cancel
);

module.exports = router;