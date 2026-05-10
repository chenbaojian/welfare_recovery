// src/controllers/order.js - 订单控制器
const orderService = require('../services/order');
const logger = require('../utils/logger');

/**
 * 创建订单
 */
exports.create = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { cardTypeId, faceValue, cardNo, cardPwd } = req.body;
    
    // 创建订单
    const order = await orderService.create({
      userId,
      cardTypeId,
      faceValue,
      cardNo,
      cardPwd
    });
    
    res.json({
      code: 200,
      message: '订单创建成功',
      data: {
        orderId: order.id,
        orderNo: order.orderNo
      }
    });
  } catch (err) {
    logger.error('创建订单失败:', err);
    next(err);
  }
};

/**
 * 订单列表
 */
exports.list = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, pageSize = 10, status } = req.query;
    
    const result = await orderService.list({
      userId,
      page,
      pageSize,
      status
    });
    
    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取订单列表失败:', err);
    next(err);
  }
};

/**
 * 订单详情
 */
exports.detail = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.query;
    
    const order = await orderService.detail(id, userId);
    
    if (!order) {
      return res.json({
        code: 30001,
        message: '订单不存在'
      });
    }
    
    res.json({
      code: 200,
      data: order
    });
  } catch (err) {
    logger.error('获取订单详情失败:', err);
    next(err);
  }
};

/**
 * 取消订单
 */
exports.cancel = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.body;
    
    const result = await orderService.cancel(orderId, userId);
    
    if (!result) {
      return res.json({
        code: 30002,
        message: '订单状态异常，无法取消'
      });
    }
    
    res.json({
      code: 200,
      message: '订单已取消'
    });
  } catch (err) {
    logger.error('取消订单失败:', err);
    next(err);
  }
};