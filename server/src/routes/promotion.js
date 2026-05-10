// src/routes/promotion.js - 推广路由
const express = require('express');
const router = express.Router();

const promotionController = require('../controllers/promotion');
const { auth } = require('../middleware/auth');

/**
 * 获取推广中心数据（统计+记录+配置+分享信息）
 * GET /api/promotion/stats
 */
router.get('/stats', auth, promotionController.getPromotionStats);

/**
 * 获取推广分享信息
 * GET /api/promotion/shareInfo
 */
router.get('/shareInfo', auth, promotionController.getShareInfo);

/**
 * 获取奖励配置
 * GET /api/promotion/config
 */
router.get('/config', auth, promotionController.getConfig);

module.exports = router;
