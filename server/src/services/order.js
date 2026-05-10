// src/services/order.js - 订单服务
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const User = require('../models/User');
const CardType = require('../models/CardType');
const { encrypt } = require('../utils/crypto');

/**
 * 生成订单号
 */
const generateOrderNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${year}${month}${day}${random}`;
};

/**
 * 创建订单
 * 订单创建后状态为 PENDING（待处理），等待管理后台人工审核完结
 */
exports.create = async (data) => {
  const { userId, cardTypeId, faceValue, cardNo, cardPwd } = data;

  // 获取卡券类型信息
  const cardType = await CardType.findByPk(cardTypeId);
  if (!cardType) {
    throw new Error('卡券类型不存在');
  }

  // 计算回收金额
  const recycleAmount = (faceValue * cardType.discountRate).toFixed(2);

  // 加密卡号卡密
  const encryptedCardNo = cardNo ? encrypt(cardNo) : null;
  const encryptedCardPwd = encrypt(cardPwd);

  // 创建订单（状态为 PENDING，等待管理后台人工审核）
  const order = await Order.create({
    orderNo: generateOrderNo(),
    userId,
    cardTypeId,
    cardTypeName: cardType.name,
    faceValue,
    recycleAmount,
    cardNo: encryptedCardNo,
    cardPwd: encryptedCardPwd,
    status: 'PENDING'
  });

  return order;
};

/**
 * 订单列表
 */
exports.list = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 10;
  const userId = params.userId;
  const status = params.status;
  const offset = (page - 1) * pageSize;

  const where = { userId };
  if (status) {
    where.status = status;
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['create_time', 'DESC']]
  });

  return {
    list: rows,
    total: count,
    hasMore: offset + rows.length < count
  };
};

/**
 * 订单详情
 */
exports.detail = async (id, userId) => {
  const order = await Order.findOne({
    where: { id, userId }
  });

  return order;
};

/**
 * 取消订单
 */
exports.cancel = async (orderId, userId) => {
  const order = await Order.findOne({
    where: { id: orderId, userId }
  });

  if (!order || order.status !== 'PENDING') {
    return false;
  }

  await Order.update(
    { status: 'CANCELLED' },
    { where: { id: orderId } }
  );

  return true;
};