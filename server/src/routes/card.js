// src/routes/card.js - 卡券路由
const express = require('express');
const router = express.Router();
const { query } = require('express-validator');

const cardController = require('../controllers/card');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * 卡券类型列表
 * GET /api/card/typeList
 */
router.get('/typeList', cardController.typeList);

/**
 * 卡券详情
 * GET /api/card/detail
 */
router.get('/detail',
  [
    query('id').notEmpty().withMessage('卡券ID不能为空')
  ],
  validate,
  cardController.detail
);

/**
 * 计算回收金额
 * POST /api/card/calculate
 */
router.post('/calculate',
  auth,
  cardController.calculate
);

module.exports = router;