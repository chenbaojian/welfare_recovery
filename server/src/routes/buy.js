// src/routes/buy.js - 买家模式路由
const express = require('express');
const router = express.Router();
const buyController = require('../controllers/buy');
const { auth: authMiddleware, verified: verifyMiddleware } = require('../middleware/auth');

// ===== 公开接口（无需登录） =====

// 获取可售卡券种类列表（游客也可浏览）
router.get('/cardTypes', buyController.cardTypes);

// 获取某类型下可售卡券列表（游客也可浏览）
router.get('/cardList', buyController.cardList);

// ===== 需要登录的接口 =====

// 创建购买订单（需登录+实名认证）
router.post('/create', authMiddleware, verifyMiddleware, buyController.create);

// 支付购买订单（需登录）
router.post('/pay', authMiddleware, buyController.pay);

// 取消购买订单（需登录）
router.post('/cancel', authMiddleware, buyController.cancel);

// 买家订单列表（需登录）
router.get('/orderList', authMiddleware, buyController.orderList);

// 买家订单详情（需登录）
router.get('/orderDetail', authMiddleware, buyController.orderDetail);

// 买家订单统计（需登录）
router.get('/orderStats', authMiddleware, buyController.orderStats);

module.exports = router;