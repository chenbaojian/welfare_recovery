// src/controllers/promotion.js - 推广控制器
const promotionService = require('../services/promotion');
const logger = require('../utils/logger');

/**
 * 获取推广中心数据
 * GET /api/promotion/stats
 */
exports.getPromotionStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const stats = await promotionService.getPromotionStats(userId);
    const config = promotionService.getRewardConfig();
    const shareInfo = await promotionService.getPromotionShareInfo(userId);

    res.json({
      code: 200,
      data: {
        ...stats,
        rewardConfig: config,
        shareInfo
      }
    });
  } catch (err) {
    logger.error('获取推广数据失败:', err);
    next(err);
  }
};

/**
 * 获取推广分享信息
 * GET /api/promotion/shareInfo
 */
exports.getShareInfo = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const shareInfo = await promotionService.getPromotionShareInfo(userId);

    res.json({
      code: 200,
      data: shareInfo
    });
  } catch (err) {
    logger.error('获取推广分享信息失败:', err);
    next(err);
  }
};

/**
 * 获取奖励配置
 * GET /api/promotion/config
 */
exports.getConfig = async (req, res, next) => {
  try {
    const config = promotionService.getRewardConfig();
    res.json({
      code: 200,
      data: config
    });
  } catch (err) {
    logger.error('获取推广配置失败:', err);
    next(err);
  }
};

module.exports = exports;
