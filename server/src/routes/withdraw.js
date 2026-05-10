// src/routes/withdraw.js - 提现路由
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const withdrawController = require('../controllers/withdraw');
const { auth, verified } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * 创建提现
 * POST /api/withdraw/create
 */
router.post('/create',
  auth,
  verified,
  [
    body('amount').isFloat({ min: 10 }).withMessage('提现金额不能低于10元'),
    body('bankId').notEmpty().withMessage('结算账户不能为空')
  ],
  validate,
  withdrawController.create
);

/**
 * 提现列表
 * GET /api/withdraw/list
 */
router.get('/list',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 50 })
  ],
  validate,
  withdrawController.list
);

/**
 * 提现详情
 * GET /api/withdraw/detail
 */
router.get('/detail',
  auth,
  [
    query('id').notEmpty().withMessage('提现ID不能为空')
  ],
  validate,
  withdrawController.detail
);

module.exports = router;