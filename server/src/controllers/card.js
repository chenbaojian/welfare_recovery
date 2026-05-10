// src/controllers/card.js - 卡券控制器
const cardService = require('../services/card');
const logger = require('../utils/logger');

/**
 * 卡券类型列表
 */
exports.typeList = async (req, res, next) => {
  try {
    const list = await cardService.getTypeList();
    
    res.json({
      code: 200,
      data: list
    });
  } catch (err) {
    logger.error('获取卡券类型列表失败:', err);
    next(err);
  }
};

/**
 * 卡券详情
 */
exports.detail = async (req, res, next) => {
  try {
    const { id } = req.query;
    
    const card = await cardService.getDetail(id);
    
    if (!card) {
      return res.json({
        code: 20001,
        message: '卡券类型不存在'
      });
    }
    
    res.json({
      code: 200,
      data: card
    });
  } catch (err) {
    logger.error('获取卡券详情失败:', err);
    next(err);
  }
};

/**
 * 计算回收金额
 */
exports.calculate = async (req, res, next) => {
  try {
    const { cardTypeId, faceValue } = req.body;
    
    const result = await cardService.calculateAmount(cardTypeId, faceValue);
    
    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('计算回收金额失败:', err);
    next(err);
  }
};