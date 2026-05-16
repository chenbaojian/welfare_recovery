// src/services/buy.js - 买家模式服务（含购买事务逻辑、防超卖）
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const BuyOrder = require('../models/BuyOrder');
const Order = require('../models/Order');
const CardType = require('../models/CardType');
const CardProduct = require('../models/CardProduct');
const CardProductFaceValue = require('../models/CardProductFaceValue');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/crypto');
const logger = require('../utils/logger');

/**
 * 生成购买订单号（前缀BUY）
 */
const generateBuyOrderNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `BUY${year}${month}${day}${random}`;
};

/**
 * 获取可售卡券种类列表
 * 查询所有启用的卡券类型，并统计每种类型下可售卡券数量
 */
exports.getAvailableCardTypes = async () => {
  const sql = `
    SELECT
      ct.id AS cardTypeId,
      ct.name,
      ct.category,
      ct.icon,
      ct.description,
      ct.buy_discount_rate AS discountRate,
      ct.sort AS sortOrder,
      COUNT(o.id) AS availableCount,
      MIN(o.face_value) AS minFaceValue,
      CASE WHEN COUNT(o.id) > 0 THEN true ELSE false END AS isAvailable
    FROM card_type ct
    LEFT JOIN \`order\` o ON ct.id = o.card_type_id AND o.status = 'SUCCESS' AND o.is_sold = 0
    WHERE ct.status = 'ACTIVE'
    GROUP BY ct.id, ct.name, ct.category, ct.icon, ct.description, ct.buy_discount_rate, ct.sort
    ORDER BY ct.sort ASC
  `;

  const results = await sequelize.query(sql, {
    type: Sequelize.QueryTypes.SELECT
  });

  return results;
};

/**
 * 获取某类型下可售卡券列表
 * 仅返回概览信息，不返回卡号卡密
 */
exports.getAvailableCardList = async (params) => {
  const { cardTypeId, sortBy = 'faceValueAsc', page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  // 排序方式映射
  const orderMap = {
    faceValueAsc: 'o.face_value ASC',
    faceValueDesc: 'o.face_value DESC',
    discountAsc: 'ct.buy_discount_rate ASC'
  };
  const orderClause = orderMap[sortBy] || 'o.face_value ASC';

  // 查询总数
  const countSql = `
    SELECT COUNT(*) AS total
    FROM \`order\` o
    WHERE o.card_type_id = :cardTypeId
      AND o.status = 'SUCCESS'
      AND o.is_sold = 0
  `;
  const countResult = await sequelize.query(countSql, {
    replacements: { cardTypeId },
    type: Sequelize.QueryTypes.SELECT
  });
  const total = countResult[0].total;

  // 查询列表
  const listSql = `
    SELECT
      o.id AS recycleOrderId,
      o.card_type_id AS cardTypeId,
      o.card_type_name AS cardTypeName,
      o.face_value AS faceValue,
      ct.buy_discount_rate AS discountRate,
      ROUND(o.face_value * ct.buy_discount_rate, 2) AS buyPrice,
      ct.description
    FROM \`order\` o
    INNER JOIN card_type ct ON o.card_type_id = ct.id
    WHERE o.card_type_id = :cardTypeId
      AND o.status = 'SUCCESS'
      AND o.is_sold = 0
    ORDER BY ${orderClause}
    LIMIT :pageSize OFFSET :offset
  `;
  const list = await sequelize.query(listSql, {
    replacements: { cardTypeId, pageSize, offset },
    type: Sequelize.QueryTypes.SELECT
  });

  // 获取卡券类型名称
  const cardType = await CardType.findByPk(cardTypeId);

  return {
    cardTypeName: cardType ? cardType.name : '',
    totalAvailable: total,
    list,
    hasMore: offset + list.length < total
  };
};

/**
 * 创建购买订单（含事务，防超卖）
 * 核心逻辑：
 * 1. 检查回收订单是否可售（status=SUCCESS AND is_sold=0）
 * 2. 在事务中创建 buy_order 并标记 order.is_sold=1
 * 3. 利用唯一索引 uk_recycle_order_id 和乐观锁防止超卖
 */
exports.createBuyOrder = async (buyerId, recycleOrderId) => {
  // 1. 查询回收订单是否可售
  const recycleOrder = await Order.findOne({
    where: {
      id: recycleOrderId,
      status: 'SUCCESS',
      isSold: false
    }
  });

  if (!recycleOrder) {
    const error = new Error('该卡券暂不可购买');
    error.code = 40002;
    throw error;
  }

  // 2. 获取卡券类型信息
  const cardType = await CardType.findByPk(recycleOrder.cardTypeId);
  if (!cardType) {
    const error = new Error('卡券类型不存在');
    error.code = 20001;
    throw error;
  }

  // 3. 计算购买价格 - 优先从面值明细表获取卖卡折扣率
  let buyDiscountRate = cardType.buyDiscountRate; // 默认使用卡类型折扣率
  // 查找该卡类型下所有卡产品ID
  const cardProducts = await CardProduct.findAll({
    where: { cardTypeId: recycleOrder.cardTypeId, status: 'ACTIVE' },
    attributes: ['id'],
    raw: true
  });
  if (cardProducts.length > 0) {
    const productIds = cardProducts.map(p => p.id);
    const fvDetail = await CardProductFaceValue.findOne({
      where: {
        cardProductId: { [Sequelize.Op.in]: productIds },
        faceValue: recycleOrder.faceValue,
        status: 'ACTIVE',
        isSaleable: 1
      },
      raw: true
    });
    if (fvDetail) {
      buyDiscountRate = parseFloat(fvDetail.buyDiscountRate);
    }
  }

  const buyPrice = parseFloat((recycleOrder.faceValue * buyDiscountRate).toFixed(2));

  // 4. 在事务中执行购买操作
  const result = await sequelize.transaction(async (t) => {
    // 创建购买订单（从回收订单复制卡号卡密加密数据）
    const buyOrder = await BuyOrder.create({
      orderNo: generateBuyOrderNo(),
      buyerId,
      recycleOrderId: recycleOrder.id,
      cardTypeId: recycleOrder.cardTypeId,
      cardTypeName: recycleOrder.cardTypeName,
      faceValue: recycleOrder.faceValue,
      discountRate: buyDiscountRate,
      buyPrice,
      cardNo: recycleOrder.cardNo,    // 已加密，直接复制
      cardPwd: recycleOrder.cardPwd,   // 已加密，直接复制
      status: 'PENDING'
    }, { transaction: t });

    // 标记回收订单为已售出（乐观锁：仅更新 is_sold=0 的记录）
    const [updateCount] = await Order.update(
      { isSold: true, buyOrderId: buyOrder.id },
      {
        where: {
          id: recycleOrderId,
          isSold: false  // 乐观锁条件
        },
        transaction: t
      }
    );

    // 若更新影响行数为0，说明已被其他用户购买，抛出异常回滚事务
    if (updateCount === 0) {
      const error = new Error('该卡券已被其他用户购买，请选择其他卡券');
      error.code = 40001;
      throw error;
    }

    return buyOrder;
  });

  return {
    buyOrderId: result.id,
    orderNo: result.orderNo,
    cardTypeName: result.cardTypeName,
    faceValue: parseFloat(result.faceValue),
    discountRate: parseFloat(result.discountRate),
    buyPrice: parseFloat(result.buyPrice),
    status: result.status
  };
};

/**
 * 支付购买订单
 * 初期采用模拟支付（直接标记为已支付），后续可接入微信支付
 */
exports.payBuyOrder = async (buyerId, buyOrderId) => {
  const buyOrder = await BuyOrder.findOne({
    where: {
      id: buyOrderId,
      buyerId,
      status: 'PENDING'
    }
  });

  if (!buyOrder) {
    const error = new Error('购买订单不存在或状态异常');
    error.code = 30001;
    throw error;
  }

  // 更新订单状态为已支付
  await BuyOrder.update(
    {
      status: 'PAID',
      payTime: new Date()
    },
    {
      where: {
        id: buyOrderId,
        status: 'PENDING'
      }
    }
  );

  // 更新用户购买统计
  await User.update(
    {
      totalBuy: sequelize.literal(`total_buy + ${buyOrder.buyPrice}`),
      buyOrderCount: sequelize.literal('buy_order_count + 1')
    },
    {
      where: { id: buyerId }
    }
  );

  // 解密卡号卡密返回给买家
  let cardNo = null;
  let cardPwd = null;
  try {
    cardNo = decrypt(buyOrder.cardNo);
    cardPwd = decrypt(buyOrder.cardPwd);
  } catch (e) {
    logger.error('解密卡号卡密失败:', e);
    cardNo = '解密失败';
    cardPwd = '解密失败';
  }

  return {
    buyOrderId: buyOrder.id,
    orderNo: buyOrder.orderNo,
    status: 'PAID',
    payTime: new Date(),
    cardNo,
    cardPwd
  };
};

/**
 * 取消购买订单
 * 在事务中取消购买订单并回滚回收订单的售出状态
 */
exports.cancelBuyOrder = async (buyerId, buyOrderId) => {
  const buyOrder = await BuyOrder.findOne({
    where: {
      id: buyOrderId,
      buyerId,
      status: 'PENDING'
    }
  });

  if (!buyOrder) {
    const error = new Error('购买订单不存在或仅待支付订单可取消');
    error.code = 30002;
    throw error;
  }

  // 在事务中执行取消操作
  await sequelize.transaction(async (t) => {
    // 1. 更新购买订单状态为 CANCELLED
    await BuyOrder.update(
      {
        status: 'CANCELLED',
        cancelTime: new Date()
      },
      {
        where: {
          id: buyOrderId,
          status: 'PENDING'
        },
        transaction: t
      }
    );

    // 2. 回滚回收订单的售出状态
    await Order.update(
      {
        isSold: false,
        buyOrderId: null
      },
      {
        where: {
          id: buyOrder.recycleOrderId,
          buyOrderId: buyOrderId
        },
        transaction: t
      }
    );
  });

  return true;
};

/**
 * 获取买家订单列表
 */
exports.getBuyOrderList = async (params) => {
  const { buyerId, page = 1, pageSize = 10, status } = params;
  const offset = (page - 1) * pageSize;

  const where = { buyerId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const { count, rows } = await BuyOrder.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['create_time', 'DESC']],
    attributes: [
      'id', 'orderNo', 'cardTypeName', 'faceValue', 'buyPrice',
      'status', 'createTime', 'payTime'
    ]
  });

  return {
    list: rows.map(row => ({
      buyOrderId: row.id,
      orderNo: row.orderNo,
      cardTypeName: row.cardTypeName,
      faceValue: parseFloat(row.faceValue),
      buyPrice: parseFloat(row.buyPrice),
      status: row.status,
      createTime: row.createTime,
      payTime: row.payTime
    })),
    total: count,
    hasMore: offset + rows.length < count
  };
};

/**
 * 获取买家订单详情
 * 仅 PAID 状态时解密返回卡号卡密
 */
exports.getBuyOrderDetail = async (buyerId, buyOrderId) => {
  const buyOrder = await BuyOrder.findOne({
    where: {
      id: buyOrderId,
      buyerId
    }
  });

  if (!buyOrder) {
    return null;
  }

  const result = {
    buyOrderId: buyOrder.id,
    orderNo: buyOrder.orderNo,
    cardTypeName: buyOrder.cardTypeName,
    faceValue: parseFloat(buyOrder.faceValue),
    discountRate: parseFloat(buyOrder.discountRate),
    buyPrice: parseFloat(buyOrder.buyPrice),
    status: buyOrder.status,
    cardNo: null,
    cardPwd: null,
    createTime: buyOrder.createTime,
    payTime: buyOrder.payTime,
    cancelTime: buyOrder.cancelTime
  };

  // 仅 PAID 状态时解密返回卡号卡密
  if (buyOrder.status === 'PAID') {
    try {
      result.cardNo = decrypt(buyOrder.cardNo);
      result.cardPwd = decrypt(buyOrder.cardPwd);
    } catch (e) {
      logger.error('解密卡号卡密失败:', e);
      result.cardNo = '解密失败';
      result.cardPwd = '解密失败';
    }
  }

  return result;
};

/**
 * 获取买家订单统计
 */
exports.getBuyOrderStats = async (buyerId) => {
  const stats = await BuyOrder.findAll({
    where: { buyerId },
    attributes: [
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      [Sequelize.fn('SUM', Sequelize.col('buy_price')), 'totalAmount']
    ],
    group: ['status'],
    raw: true
  });

  // 汇总为前端需要的格式
  let totalBuy = 0;
  let buyOrderCount = 0;
  let pendingCount = 0;
  let paidCount = 0;
  let cancelledCount = 0;

  for (const item of stats) {
    const count = parseInt(item.count) || 0;
    const amount = parseFloat(item.totalAmount) || 0;

    buyOrderCount += count;

    if (item.status === 'PAID') {
      totalBuy += amount;
      paidCount += count;
    } else if (item.status === 'PENDING') {
      pendingCount += count;
    } else if (item.status === 'CANCELLED') {
      cancelledCount += count;
    }
  }

  return {
    totalBuy: totalBuy.toFixed(2),
    buyOrderCount,
    pendingCount,
    paidCount,
    cancelledCount
  };
};

/**
 * 超时自动取消（定时任务调用）
 * 取消创建超过30分钟仍未支付的购买订单
 */
exports.cancelTimeoutOrders = async () => {
  const timeoutMinutes = 30;
  const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // 查询超时的待支付订单
  const timeoutOrders = await BuyOrder.findAll({
    where: {
      status: 'PENDING',
      createTime: {
        [Sequelize.Op.lt]: timeoutDate
      }
    }
  });

  logger.info(`发现 ${timeoutOrders.length} 个超时购买订单`);

  for (const order of timeoutOrders) {
    try {
      await sequelize.transaction(async (t) => {
        // 1. 更新购买订单状态为 CANCELLED
        await BuyOrder.update(
          {
            status: 'CANCELLED',
            cancelTime: new Date()
          },
          {
            where: { id: order.id, status: 'PENDING' },
            transaction: t
          }
        );

        // 2. 回滚回收订单的售出状态
        await Order.update(
          {
            isSold: false,
            buyOrderId: null
          },
          {
            where: {
              id: order.recycleOrderId,
              buyOrderId: order.id
            },
            transaction: t
          }
        );
      });

      logger.info(`超时购买订单 ${order.orderNo} 已自动取消`);
    } catch (err) {
      logger.error(`取消超时购买订单 ${order.orderNo} 失败:`, err);
    }
  }

  return timeoutOrders.length;
};