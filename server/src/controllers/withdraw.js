// src/controllers/withdraw.js - 提现控制器
const withdrawService = require('../services/withdraw');
const logger = require('../utils/logger');

/**
 * 创建提现
 */
exports.create = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, bankId } = req.body;
    
    const result = await withdrawService.create({
      userId,
      amount,
      bankId
    });
    
    res.json({
      code: 200,
      message: '提现申请已提交',
      data: result
    });
  } catch (err) {
    logger.error('创建提现失败:', err);
    next(err);
  }
};

/**
 * 提现列表
 */
exports.list = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, pageSize = 10 } = req.query;
    
    const result = await withdrawService.list({
      userId,
      page,
      pageSize
    });
    
    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取提现列表失败:', err);
    next(err);
  }
};

/**
 * 提现详情
 */
exports.detail = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.query;
    
    const withdraw = await withdrawService.detail(id, userId);
    
    if (!withdraw) {
      return res.json({
        code: 40001,
        message: '提现记录不存在'
      });
    }
    
    res.json({
      code: 200,
      data: withdraw
    });
  } catch (err) {
    logger.error('获取提现详情失败:', err);
    next(err);
  }
};