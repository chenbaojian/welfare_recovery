// src/controllers/buy.js - 买家模式控制器
const buyService = require('../services/buy');
const logger = require('../utils/logger');

/**
 * 获取可售卡券种类列表
 */
exports.cardTypes = async (req, res, next) => {
  try {
    const data = await buyService.getAvailableCardTypes();

    res.json({
      code: 200,
      data
    });
  } catch (err) {
    logger.error('获取可售卡券种类失败:', err);
    next(err);
  }
};

/**
 * 获取某类型下可售卡券列表
 */
exports.cardList = async (req, res, next) => {
  try {
    const { cardTypeId, sortBy, page, pageSize } = req.query;

    if (!cardTypeId) {
      return res.json({
        code: 400,
        message: '缺少卡券类型ID参数'
      });
    }

    const data = await buyService.getAvailableCardList({
      cardTypeId: parseInt(cardTypeId),
      sortBy,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    });

    res.json({
      code: 200,
      data
    });
  } catch (err) {
    logger.error('获取可售卡券列表失败:', err);
    next(err);
  }
};

/**
 * 创建购买订单
 */
exports.create = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { recycleOrderId } = req.body;

    if (!recycleOrderId) {
      return res.json({
        code: 400,
        message: '缺少回收订单ID参数'
      });
    }

    const data = await buyService.createBuyOrder(buyerId, parseInt(recycleOrderId));

    res.json({
      code: 200,
      message: '购买订单创建成功',
      data
    });
  } catch (err) {
    logger.error('创建购买订单失败:', err);

    // 业务错误码
    if (err.code === 40001) {
      return res.json({
        code: 40001,
        message: '该卡券已被其他用户购买，请选择其他卡券'
      });
    }

    if (err.code === 40002) {
      return res.json({
        code: 40002,
        message: '该卡券暂不可购买'
      });
    }

    next(err);
  }
};

/**
 * 支付购买订单
 */
exports.pay = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { buyOrderId } = req.body;

    if (!buyOrderId) {
      return res.json({
        code: 400,
        message: '缺少购买订单ID参数'
      });
    }

    const data = await buyService.payBuyOrder(buyerId, parseInt(buyOrderId));

    res.json({
      code: 200,
      message: '支付成功',
      data
    });
  } catch (err) {
    logger.error('支付购买订单失败:', err);

    if (err.code === 30001) {
      return res.json({
        code: 30001,
        message: '购买订单不存在或状态异常'
      });
    }

    next(err);
  }
};

/**
 * 取消购买订单
 */
exports.cancel = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { buyOrderId } = req.body;

    if (!buyOrderId) {
      return res.json({
        code: 400,
        message: '缺少购买订单ID参数'
      });
    }

    const result = await buyService.cancelBuyOrder(buyerId, parseInt(buyOrderId));

    if (!result) {
      return res.json({
        code: 30002,
        message: '购买订单不存在或仅待支付订单可取消'
      });
    }

    res.json({
      code: 200,
      message: '订单已取消'
    });
  } catch (err) {
    logger.error('取消购买订单失败:', err);

    if (err.code === 30002) {
      return res.json({
        code: 30002,
        message: '购买订单不存在或仅待支付订单可取消'
      });
    }

    next(err);
  }
};

/**
 * 买家订单列表
 */
exports.orderList = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { page, pageSize, status } = req.query;

    const data = await buyService.getBuyOrderList({
      buyerId,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      status
    });

    res.json({
      code: 200,
      data
    });
  } catch (err) {
    logger.error('获取买家订单列表失败:', err);
    next(err);
  }
};

/**
 * 买家订单详情
 */
exports.orderDetail = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { buyOrderId } = req.query;

    if (!buyOrderId) {
      return res.json({
        code: 400,
        message: '缺少购买订单ID参数'
      });
    }

    const data = await buyService.getBuyOrderDetail(buyerId, parseInt(buyOrderId));

    if (!data) {
      return res.json({
        code: 30001,
        message: '购买订单不存在'
      });
    }

    res.json({
      code: 200,
      data
    });
  } catch (err) {
    logger.error('获取买家订单详情失败:', err);
    next(err);
  }
};

/**
 * 买家订单统计
 */
exports.orderStats = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;

    const data = await buyService.getBuyOrderStats(buyerId);

    res.json({
      code: 200,
      data
    });
  } catch (err) {
    logger.error('获取买家订单统计失败:', err);
    next(err);
  }
};

/**
 * 获取卡产品可售面值列表
 */
exports.getSaleableFaceValues = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminService = require('../services/admin');
    const data = await adminService.getSaleableFaceValues(id);
    res.json({ code: 200, message: '查询成功', data });
  } catch (err) {
    logger.error('获取可售面值列表失败:', err);
    next(err);
  }
};
