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
 * 获取某类型下的卡产品列表
 * GET /api/card/type/:typeId/products
 */
router.get('/type/:typeId/products', cardController.typeProducts);

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
 * 获取卡产品回收面值列表
 * GET /api/card/card-product/:id/face-values
 */
router.get('/card-product/:id/face-values', cardController.getRecycleFaceValues);

/**
 * 计算回收金额
 * POST /api/card/calculate
 */
router.post('/calculate',
  auth,
  cardController.calculate
);

module.exports = router;