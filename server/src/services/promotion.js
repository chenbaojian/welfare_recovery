// src/services/promotion.js - 推广服务
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Promotion = require('../models/Promotion');
const User = require('../models/User');
const BalanceLog = require('../models/BalanceLog');
const logger = require('../utils/logger');

// 奖励金额配置（可后台修改）
const REWARD_CONFIG = {
  registerAmount: 2.00,   // 注册奖励
  tradeAmount: 8.00       // 交易奖励
};

/**
 * 获取奖励配置
 */
function getRewardConfig() {
  return { ...REWARD_CONFIG };
}

/**
 * 更新奖励配置
 */
function setRewardConfig(config) {
  if (config.registerAmount !== undefined) {
    REWARD_CONFIG.registerAmount = config.registerAmount;
  }
  if (config.tradeAmount !== undefined) {
    REWARD_CONFIG.tradeAmount = config.tradeAmount;
  }
  return getRewardConfig();
}

/**
 * 创建推广关系（新用户注册时调用）
 * @param {number} promoterId 推广人ID
 * @param {number} newUserId 新用户ID
 * @returns {Promise<Object>}
 */
async function createPromotion(promoterId, newUserId) {
  // 防止自推广
  if (promoterId === newUserId) {
    logger.warn(`[推广] 自推广拦截: userId=${newUserId}`);
    return null;
  }

  // 检查推广人是否存在且有效
  const promoter = await User.findByPk(promoterId);
  if (!promoter || promoter.status !== 'ACTIVE') {
    logger.warn(`[推广] 推广人无效: promoterId=${promoterId}`);
    return null;
  }

  // 检查新用户是否已被推广
  const existing = await Promotion.findOne({ where: { newUserId } });
  if (existing) {
    logger.warn(`[推广] 用户已被推广: newUserId=${newUserId}, promoterId=${existing.promoterId}`);
    return null;
  }

  // 创建推广关系
  const promotion = await Promotion.create({
    promoterId,
    newUserId,
    registerReward: REWARD_CONFIG.registerAmount,
    registerRewardStatus: 'PENDING',
    tradeReward: REWARD_CONFIG.tradeAmount,
    tradeRewardStatus: 'PENDING'
  });

  logger.info(`[推广] 推广关系创建成功: promoterId=${promoterId}, newUserId=${newUserId}`);

  // 自动发放注册奖励
  await grantRegisterReward(promotion.id);

  return promotion;
}

/**
 * 发放注册奖励
 * @param {number} promotionId 推广记录ID
 */
async function grantRegisterReward(promotionId) {
  const t = await sequelize.transaction();

  try {
    const promotion = await Promotion.findByPk(promotionId, { transaction: t });
    if (!promotion || promotion.registerRewardStatus !== 'PENDING') {
      await t.commit();
      return;
    }

    const amount = parseFloat(promotion.registerReward);
    if (amount <= 0) {
      await t.commit();
      return;
    }

    // 获取推广人当前余额
    const promoter = await User.findByPk(promotion.promoterId, { transaction: t });
    const balanceBefore = parseFloat(promoter.balance);
    const balanceAfter = balanceBefore + amount;

    // 更新推广人余额
    await User.update(
      { balance: balanceAfter },
      { where: { id: promotion.promoterId }, transaction: t }
    );

    // 记录余额流水
    await BalanceLog.create({
      userId: promotion.promoterId,
      type: 'PROMOTION_REGISTER',
      amount: amount,
      balanceBefore,
      balanceAfter,
      remark: '新用户注册推广奖励'
    }, { transaction: t });

    // 更新推广记录状态
    await Promotion.update(
      {
        registerRewardStatus: 'PAID',
        registerRewardTime: new Date()
      },
      { where: { id: promotionId }, transaction: t }
    );

    await t.commit();

    logger.info(`[推广] 注册奖励发放成功: promotionId=${promotionId}, amount=${amount}, promoterId=${promotion.promoterId}`);

    // 异步发送模板消息通知
    sendRewardNotice(promotion.promoterId, 'register', amount).catch(() => {});
  } catch (err) {
    await t.rollback();
    logger.error(`[推广] 注册奖励发放失败: promotionId=${promotionId}`, err);

    // 标记失败
    await Promotion.update(
      { registerRewardStatus: 'FAILED' },
      { where: { id: promotionId } }
    ).catch(() => {});
  }
}

/**
 * 发放交易奖励（新用户订单完成时调用）
 * @param {number} newUserId 新用户ID
 * @param {number} orderId 订单ID
 */
async function grantTradeReward(newUserId, orderId) {
  const t = await sequelize.transaction();

  try {
    // 查找推广关系
    const promotion = await Promotion.findOne({
      where: { newUserId, tradeRewardStatus: 'PENDING' }
    });

    if (!promotion) {
      await t.commit();
      return;
    }

    const amount = parseFloat(promotion.tradeReward);
    if (amount <= 0) {
      await t.commit();
      return;
    }

    // 获取推广人当前余额
    const promoter = await User.findByPk(promotion.promoterId, { transaction: t });
    const balanceBefore = parseFloat(promoter.balance);
    const balanceAfter = balanceBefore + amount;

    // 更新推广人余额
    await User.update(
      { balance: balanceAfter },
      { where: { id: promotion.promoterId }, transaction: t }
    );

    // 记录余额流水
    await BalanceLog.create({
      userId: promotion.promoterId,
      type: 'PROMOTION_TRADE',
      amount: amount,
      balanceBefore,
      balanceAfter,
      remark: '新用户交易推广奖励'
    }, { transaction: t });

    // 更新推广记录状态
    await Promotion.update(
      {
        tradeRewardStatus: 'PAID',
        tradeRewardTime: new Date(),
        tradeOrderId: orderId
      },
      { where: { id: promotion.id }, transaction: t }
    );

    await t.commit();

    logger.info(`[推广] 交易奖励发放成功: promotionId=${promotion.id}, amount=${amount}, orderId=${orderId}`);

    // 异步发送模板消息通知
    sendRewardNotice(promotion.promoterId, 'trade', amount).catch(() => {});
  } catch (err) {
    await t.rollback();
    logger.error(`[推广] 交易奖励发放失败: newUserId=${newUserId}, orderId=${orderId}`, err);

    // 标记失败
    await Promotion.update(
      { tradeRewardStatus: 'FAILED' },
      { where: { newUserId, tradeRewardStatus: 'PENDING' } }
    ).catch(() => {});
  }
}

/**
 * 收回奖励（订单退款/纠纷时调用）
 * @param {number} newUserId 新用户ID
 * @param {number} orderId 订单ID
 */
async function recallTradeReward(newUserId, orderId) {
  const t = await sequelize.transaction();

  try {
    const promotion = await Promotion.findOne({
      where: {
        newUserId,
        tradeRewardStatus: 'PAID',
        tradeOrderId: orderId
      }
    });

    if (!promotion) {
      await t.commit();
      return;
    }

    const amount = parseFloat(promotion.tradeReward);
    if (amount <= 0) {
      await t.commit();
      return;
    }

    // 从推广人余额中扣除
    const promoter = await User.findByPk(promotion.promoterId, { transaction: t });
    const balanceBefore = parseFloat(promoter.balance);
    const balanceAfter = Math.max(0, balanceBefore - amount);

    await User.update(
      { balance: balanceAfter },
      { where: { id: promotion.promoterId }, transaction: t }
    );

    // 记录余额流水（负数）
    await BalanceLog.create({
      userId: promotion.promoterId,
      type: 'PROMOTION_RECALL',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      remark: '推广奖励收回（订单异常）'
    }, { transaction: t });

    // 更新推广记录状态
    await Promotion.update(
      {
        tradeRewardStatus: 'RECALLED',
        status: 'RECALLED'
      },
      { where: { id: promotion.id }, transaction: t }
    );

    await t.commit();

    logger.info(`[推广] 奖励收回成功: promotionId=${promotion.id}, amount=${amount}, orderId=${orderId}`);
  } catch (err) {
    await t.rollback();
    logger.error(`[推广] 奖励收回失败: newUserId=${newUserId}, orderId=${orderId}`, err);
  }
}

/**
 * 获取推广人统计数据
 * @param {number} userId 用户ID
 * @returns {Promise<Object>}
 */
async function getPromotionStats(userId) {
  const promotions = await Promotion.findAll({
    where: { promoterId: userId },
    include: [{
      model: User,
      as: 'newUser',
      attributes: ['id', 'nickname', 'phone', 'createTime']
    }],
    order: [['createTime', 'DESC']]
  });

  let totalReward = 0;
  let pendingReward = 0;
  let paidReward = 0;
  let registerCount = 0;
  let tradeCount = 0;

  const records = promotions.map(p => {
    const registerAmount = parseFloat(p.registerReward || 0);
    const tradeAmount = parseFloat(p.tradeReward || 0);

    if (p.registerRewardStatus === 'PAID') {
      totalReward += registerAmount;
      paidReward += registerAmount;
      registerCount++;
    } else if (p.registerRewardStatus === 'PENDING') {
      pendingReward += registerAmount;
    }

    if (p.tradeRewardStatus === 'PAID') {
      totalReward += tradeAmount;
      paidReward += tradeAmount;
      tradeCount++;
    } else if (p.tradeRewardStatus === 'PENDING') {
      pendingReward += tradeAmount;
    }

    return {
      id: p.id,
      newUser: p.newUser ? {
        id: p.newUser.id,
        nickname: p.newUser.nickname || '用户',
        phone: p.newUser.phone ? p.newUser.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
        registerTime: p.newUser.createTime
      } : null,
      registerReward: registerAmount,
      registerRewardStatus: p.registerRewardStatus,
      registerRewardTime: p.registerRewardTime,
      tradeReward: tradeAmount,
      tradeRewardStatus: p.tradeRewardStatus,
      tradeRewardTime: p.tradeRewardTime,
      tradeOrderId: p.tradeOrderId,
      totalReward: (registerAmount + tradeAmount).toFixed(2),
      createTime: p.createTime
    };
  });

  return {
    totalPeople: promotions.length,
    totalReward: totalReward.toFixed(2),
    pendingReward: pendingReward.toFixed(2),
    paidReward: paidReward.toFixed(2),
    registerCount,
    tradeCount,
    records
  };
}

/**
 * 获取推广二维码/链接信息
 * @param {number} userId 用户ID
 * @returns {Promise<Object>}
 */
async function getPromotionShareInfo(userId) {
  // 生成推广链接（包含推广人ID参数）
  const shareUrl = `/pages/index/index?promoterId=${userId}`;
  const shareTitle = '闲置卡券一键变现，快来福利回收看看吧！';

  return {
    promoterId: userId,
    shareUrl,
    shareTitle,
    // 二维码图片URL（由前端生成或后端提供）
    qrCodeUrl: null
  };
}

/**
 * 发送奖励通知（模板消息）
 * @param {number} userId 用户ID
 * @param {string} type register/trade
 * @param {number} amount 金额
 */
async function sendRewardNotice(userId, type, amount) {
  try {
    // TODO: 集成微信订阅消息发送
    // 需要预先申请模板并获取模板ID
    logger.info(`[推广] 发送奖励通知: userId=${userId}, type=${type}, amount=${amount}`);
  } catch (err) {
    logger.error(`[推广] 发送通知失败: userId=${userId}`, err);
  }
}

module.exports = {
  getRewardConfig,
  setRewardConfig,
  createPromotion,
  grantRegisterReward,
  grantTradeReward,
  recallTradeReward,
  getPromotionStats,
  getPromotionShareInfo
};
