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
 * 获取某类型下的卡产品列表
 */
exports.typeProducts = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const list = await cardService.getTypeProducts(typeId);

    res.json({
      code: 200,
      data: list
    });
  } catch (err) {
    logger.error(`获取卡产品列表失败: ${err.message}`);
    next(err);
  }
};

/**
 * 计算回收金额
 */
exports.calculate = async (req, res, next) => {
  try {
    const { cardTypeId, faceValue, cardProductId } = req.body;

    const result = await cardService.calculateAmount(cardTypeId, faceValue, cardProductId);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('计算回收金额失败:', err);
    next(err);
  }
};

/**
 * 获取卡产品回收面值列表
 */
exports.getRecycleFaceValues = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminService = require('../services/admin');
    const data = await adminService.getRecycleFaceValues(id);
    res.json({ code: 200, message: '查询成功', data });
  } catch (err) {
    logger.error('获取回收面值列表失败:', err);
    next(err);
  }
};