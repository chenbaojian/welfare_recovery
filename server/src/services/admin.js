// src/services/admin.js - 管理后台服务
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const User = require('../models/User');
const CardType = require('../models/CardType');
const BalanceLog = require('../models/BalanceLog');
const BuyOrder = require('../models/BuyOrder');
const { decrypt } = require('../utils/crypto');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const sequelize = require('../config/database');
const { Sequelize, Op } = require('sequelize');

/**
 * 将snake_case字段名转换为camelCase
 */
function toCamelCase(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;

  const result = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

/**
 * 管理员登录
 */
exports.login = async (username, password) => {
  const admin = await Admin.findOne({ where: { username } });

  if (!admin) {
    throw new Error('用户名或密码错误');
  }

  if (admin.status === 'DISABLED') {
    throw new Error('管理员已被禁用');
  }

  // 验证密码
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new Error('用户名或密码错误');
  }

  // 更新登录时间
  await Admin.update(
    { lastLoginTime: new Date() },
    { where: { id: admin.id } }
  );

  // 生成token
  const token = generateToken({ adminId: admin.id });

  return {
    token,
    adminInfo: {
      id: admin.id,
      username: admin.username,
      realName: admin.realName,
      role: admin.role
    }
  };
};

/**
 * 获取订单列表（管理后台）
 */
exports.getOrderList = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  const where = {};
  if (params.status) where.status = params.status;
  if (params.orderNo) where.orderNo = params.orderNo;
  if (params.userId) where.userId = params.userId;

  if (params.startDate && params.endDate) {
    where.createTime = {
      [Op.between]: [params.startDate, params.endDate]
    };
  } else if (params.startDate) {
    where.createTime = {
      [Op.gte]: params.startDate
    };
  } else if (params.endDate) {
    where.createTime = {
      [Op.lte]: params.endDate
    };
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['create_time', 'DESC']],
    raw: true
  });

  // 解密卡号卡密供管理员查看，并转换为驼峰命名
  const list = rows.map(order => {
    const camelOrder = toCamelCase(order);
    try {
      camelOrder.cardNoDecrypt = decrypt(order.cardNo || order.card_no);
      camelOrder.cardPwdDecrypt = decrypt(order.cardPwd || order.card_pwd);
    } catch (e) {
      camelOrder.cardNoDecrypt = '解密失败';
      camelOrder.cardPwdDecrypt = '解密失败';
    }
    return camelOrder;
  });

  // 关联用户信息
  for (const order of list) {
    const user = await User.findByPk(order.userId);
    if (user) {
      order.userPhone = user.phone;
      order.userNickname = user.nickname;
      order.userRealName = user.realName;
    }
  }

  return {
    list,
    total: count,
    page,
    pageSize
  };
};

/**
 * 获取订单详情（管理后台）
 */
exports.getOrderDetail = async (orderId) => {
  const order = await Order.findByPk(orderId);

  if (!order) {
    return null;
  }

  const orderData = toCamelCase(order.toJSON());

  // 解密卡号卡密
  try {
    orderData.cardNoDecrypt = decrypt(orderData.cardNo);
    orderData.cardPwdDecrypt = decrypt(orderData.cardPwd);
  } catch (e) {
    orderData.cardNoDecrypt = '解密失败';
    orderData.cardPwdDecrypt = '解密失败';
  }

  // 关联用户信息
  const user = await User.findByPk(orderData.userId);
  if (user) {
    orderData.userPhone = user.phone;
    orderData.userNickname = user.nickname;
    orderData.userRealName = user.real_name;
  }

  return orderData;
};

/**
 * 完结订单（人工审核确认）
 * 1. 更新订单状态为 SUCCESS
 * 2. 将回收金额入账到用户余额
 * 3. 记录余额流水
 */
exports.completeOrder = async (orderId, adminId) => {
  // 使用事务确保数据一致性
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(orderId, { transaction });

    if (!order) {
      await transaction.rollback();
      throw new Error('订单不存在');
    }

    // 只有 PENDING 和 PROCESSING 状态的订单可以完结
    if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      await transaction.rollback();
      throw new Error('订单状态异常，无法完结');
    }

    // 获取用户当前余额
    const user = await User.findByPk(order.userId, { transaction });
    if (!user) {
      await transaction.rollback();
      throw new Error('用户不存在');
    }

    const balanceBefore = parseFloat(user.balance);
    const recycleAmount = parseFloat(order.recycleAmount);
    const balanceAfter = balanceBefore + recycleAmount;

    // 1. 更新订单状态
    await Order.update(
      {
        status: 'SUCCESS',
        completeTime: new Date()
      },
      { where: { id: orderId }, transaction }
    );

    // 2. 入账到用户余额 + 更新累计回收 + 更新订单数量
    await User.update(
      {
        balance: balanceAfter,
        totalRecycle: parseFloat(user.totalRecycle) + recycleAmount,
        orderCount: user.orderCount + 1
      },
      { where: { id: order.userId }, transaction }
    );

    // 3. 记录余额流水
    await BalanceLog.create({
      userId: order.userId,
      orderId: order.id,
      type: 'RECYCLE_INCOME',
      amount: recycleAmount,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      remark: `订单 ${order.orderNo} 回收入账`,
      operatorId: adminId
    }, { transaction });

    await transaction.commit();

    logger.info(`管理员 ${adminId} 完结订单 ${orderId}, 用户 ${order.userId} 入账 ${recycleAmount}元`);

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      recycleAmount,
      balanceAfter
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * 拒绝订单（人工审核拒绝）
 */
exports.rejectOrder = async (orderId, adminId, failReason) => {
  const order = await Order.findByPk(orderId);

  if (!order) {
    throw new Error('订单不存在');
  }

  // 只有 PENDING 和 PROCESSING 状态的订单可以拒绝
  if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
    throw new Error('订单状态异常，无法拒绝');
  }

  await Order.update(
    {
      status: 'FAILED',
      failReason: failReason || '卡券核验失败',
      completeTime: new Date()
    },
    { where: { id: orderId } }
  );

  logger.info(`管理员 ${adminId} 拒绝订单 ${orderId}, 原因: ${failReason}`);

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    failReason
  };
};

/**
 * 获取用户列表（管理后台）
 */
exports.getUserList = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  const where = {};
  if (params.phone) where.phone = params.phone;
  if (params.nickname) where.nickname = { [Op.like]: `%${params.nickname}%` };
  if (params.status) where.status = params.status;

  const { count, rows } = await User.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['create_time', 'DESC']],
    attributes: { exclude: ['openId', 'sessionKey', 'idCard'] },
    raw: true
  });

  return {
    list: rows.map(toCamelCase),
    total: count,
    page,
    pageSize
  };
};

/**
 * 获取用户详情（管理后台）
 */
exports.getUserDetail = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['openId', 'sessionKey'] }
  });

  if (!user) {
    return null;
  }

  // 获取用户订单统计
  const orderStats = await Order.findAll({
    where: { userId },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalAmount']
    ],
    group: ['status'],
    raw: true
  });

  // 获取余额流水
  const balanceLogs = await BalanceLog.findAll({
    where: { userId },
    order: [['create_time', 'DESC']],
    limit: 20,
    raw: true
  });

  return {
    userInfo: toCamelCase(user.toJSON()),
    orderStats: orderStats.map(toCamelCase),
    balanceLogs: balanceLogs.map(toCamelCase)
  };
};

/**
 * 获取统计数据（管理后台首页）
 */
exports.getDashboardStats = async () => {
  // 今日订单数
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = await Order.count({
    where: {
      createTime: { [Op.gte]: todayStart }
    }
  });

  // 待处理订单数
  const pendingOrders = await Order.count({
    where: { status: 'PENDING' }
  });

  // 处理中订单数
  const processingOrders = await Order.count({
    where: { status: 'PROCESSING' }
  });

  // 总用户数
  const totalUsers = await User.count();

  // 今日新增用户
  const todayUsers = await User.count({
    where: {
      createTime: { [Op.gte]: todayStart }
    }
  });

  // 总回收金额
  const totalRecycleResult = await Order.findAll({
    where: { status: 'SUCCESS' },
    attributes: [[sequelize.fn('SUM', sequelize.col('recycle_amount')), 'total']],
    raw: true
  });
  const totalRecycle = totalRecycleResult[0]?.total || 0;

  // 今日回收金额
  const todayRecycleResult = await Order.findAll({
    where: {
      status: 'SUCCESS',
      createTime: { [Op.gte]: todayStart }
    },
    attributes: [[sequelize.fn('SUM', sequelize.col('recycle_amount')), 'total']],
    raw: true
  });
  const todayRecycle = todayRecycleResult[0]?.total || 0;

  return {
    todayOrders,
    pendingOrders,
    processingOrders,
    totalUsers,
    todayUsers,
    totalRecycle: parseFloat(totalRecycle),
    todayRecycle: parseFloat(todayRecycle)
  };
};

// ========== 回收资产 ==========

/**
 * 构建回收资产筛选条件
 */
function buildAssetWhere(params) {
  const where = { status: 'SUCCESS' };

  if (params.cardTypeName) {
    where.cardTypeName = params.cardTypeName;
  }

  if (params.minFaceValue || params.maxFaceValue) {
    where.faceValue = {};
    if (params.minFaceValue) where.faceValue[Op.gte] = parseFloat(params.minFaceValue);
    if (params.maxFaceValue) where.faceValue[Op.lte] = parseFloat(params.maxFaceValue);
  }

  if (params.startDate || params.endDate) {
    where.completeTime = {};
    if (params.startDate) where.completeTime[Op.gte] = new Date(params.startDate);
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.completeTime[Op.lte] = endDate;
    }
  }

  // 手机号筛选需要关联User表
  if (params.phone) {
    // 先查出匹配手机号的用户ID列表
    // 在getAssetSummary和getAssetDetail中单独处理
  }

  return where;
}

/**
 * 获取回收资产汇总统计
 */
exports.getAssetSummary = async (params) => {
  const where = buildAssetWhere(params);

  // 手机号筛选：先查出匹配的用户ID
  let userIds = null;
  if (params.phone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.phone}%` } },
      attributes: ['id'],
      raw: true
    });
    userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return {
        totalCount: 0,
        totalFaceValue: 0,
        totalRecycleAmount: 0,
        cardTypeCount: 0,
        cardTypeSummary: []
      };
    }
    where.userId = { [Op.in]: userIds };
  }

  // 全局汇总
  const totalResult = await Order.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
      [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('card_type_name'))), 'cardTypeCount']
    ],
    raw: true
  });

  const totalCount = parseInt(totalResult[0]?.totalCount) || 0;
  const totalFaceValue = parseFloat(totalResult[0]?.totalFaceValue) || 0;
  const totalRecycleAmount = parseFloat(totalResult[0]?.totalRecycleAmount) || 0;
  const cardTypeCount = parseInt(totalResult[0]?.cardTypeCount) || 0;

  // 按卡券类型分组汇总
  const cardTypeSummary = await Order.findAll({
    where,
    attributes: [
      'card_type_name',
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
      [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount']
    ],
    group: ['card_type_name'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    raw: true
  });

  // 为每种卡券类型计算折扣率并获取面值分布
  const summaryList = await Promise.all(cardTypeSummary.map(async (item) => {
    const itemTotalCount = parseInt(item.totalCount) || 0;
    const itemTotalFaceValue = parseFloat(item.totalFaceValue) || 0;
    const itemTotalRecycleAmount = parseFloat(item.totalRecycleAmount) || 0;
    const avgDiscountRate = itemTotalFaceValue > 0
      ? Math.round(itemTotalRecycleAmount / itemTotalFaceValue * 10000) / 100
      : 0;

    // 获取该类型的面值分布
    const faceValueWhere = { ...where, cardTypeName: item.card_type_name };
    const faceValueDistribution = await Order.findAll({
      where: faceValueWhere,
      attributes: [
        'face_value',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
        [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount']
      ],
      group: ['face_value'],
      order: [['face_value', 'ASC']],
      raw: true
    });

    // 获取卡券类型ID
    const cardType = await CardType.findOne({
      where: { name: item.card_type_name },
      raw: true
    });

    return {
      cardTypeName: item.card_type_name,
      cardTypeId: cardType ? cardType.id : null,
      totalCount: itemTotalCount,
      totalFaceValue: itemTotalFaceValue,
      totalRecycleAmount: itemTotalRecycleAmount,
      avgDiscountRate,
      faceValueDistribution: faceValueDistribution.map(fv => ({
        faceValue: parseFloat(fv.face_value),
        count: parseInt(fv.count) || 0,
        totalFaceValue: parseFloat(fv.totalFaceValue) || 0,
        totalRecycleAmount: parseFloat(fv.totalRecycleAmount) || 0
      }))
    };
  }));

  return {
    totalCount,
    totalFaceValue,
    totalRecycleAmount,
    cardTypeCount,
    cardTypeSummary: summaryList
  };
};

/**
 * 获取回收资产明细列表
 */
exports.getAssetDetail = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 20;
  const offset = (page - 1) * pageSize;

  const where = buildAssetWhere(params);

  // 手机号筛选
  if (params.phone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.phone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
    where.userId = { [Op.in]: userIds };
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['complete_time', 'DESC']],
    raw: true
  });

  // 解密卡号卡密 + 关联用户信息
  // 批量获取用户信息避免N+1查询
  const userIdList = [...new Set(rows.map(o => o.user_id))];
  const userMap = {};
  if (userIdList.length > 0) {
    const users = await User.findAll({
      where: { id: { [Op.in]: userIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    users.forEach(u => { userMap[u.id] = u; });
  }

  const list = rows.map(order => {
    const camelOrder = toCamelCase(order);
    try {
      camelOrder.cardNoDecrypt = decrypt(order.card_no);
      camelOrder.cardPwdDecrypt = decrypt(order.card_pwd);
    } catch (e) {
      camelOrder.cardNoDecrypt = '解密失败';
      camelOrder.cardPwdDecrypt = '解密失败';
    }
    const user = userMap[order.user_id];
    if (user) {
      camelOrder.userNickname = user.nickname;
      camelOrder.userPhone = user.phone;
    }
    return camelOrder;
  });

  return {
    list,
    total: count,
    page,
    pageSize
  };
};

/**
 * 导出回收资产Excel
 */
exports.exportAssets = async (params) => {
  const ExcelJS = require('exceljs');
  const where = buildAssetWhere(params);

  // 手机号筛选
  if (params.phone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.phone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return null; // 无数据可导出
    }
    where.userId = { [Op.in]: userIds };
  }

  // 查询所有符合条件的订单
  const rows = await Order.findAll({
    where,
    order: [['complete_time', 'DESC']],
    raw: true
  });

  if (rows.length === 0) {
    return null;
  }

  // 批量获取用户信息
  const userIdList = [...new Set(rows.map(o => o.user_id))];
  const userMap = {};
  if (userIdList.length > 0) {
    const users = await User.findAll({
      where: { id: { [Op.in]: userIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    users.forEach(u => { userMap[u.id] = u; });
  }

  // 创建Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('回收资产明细');

  // 表头
  sheet.columns = [
    { header: '订单号', key: 'orderNo', width: 20 },
    { header: '用户昵称', key: 'userNickname', width: 15 },
    { header: '用户手机号', key: 'userPhone', width: 15 },
    { header: '卡券类型', key: 'cardTypeName', width: 15 },
    { header: '卡券面值', key: 'faceValue', width: 12 },
    { header: '回收金额', key: 'recycleAmount', width: 12 },
    { header: '卡号', key: 'cardNoDecrypt', width: 20 },
    { header: '卡密', key: 'cardPwdDecrypt', width: 20 },
    { header: '提交时间', key: 'createTime', width: 20 },
    { header: '完结时间', key: 'completeTime', width: 20 }
  ];

  // 表头样式
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  // 数据行
  rows.forEach(order => {
    let cardNoDecrypt, cardPwdDecrypt;
    try {
      cardNoDecrypt = decrypt(order.card_no);
      cardPwdDecrypt = decrypt(order.card_pwd);
    } catch (e) {
      cardNoDecrypt = '解密失败';
      cardPwdDecrypt = '解密失败';
    }

    const user = userMap[order.user_id];

    sheet.addRow({
      orderNo: order.order_no,
      userNickname: user ? user.nickname : '-',
      userPhone: user ? user.phone : '-',
      cardTypeName: order.card_type_name,
      faceValue: parseFloat(order.face_value),
      recycleAmount: parseFloat(order.recycle_amount),
      cardNoDecrypt,
      cardPwdDecrypt,
      createTime: order.create_time ? new Date(order.create_time).toLocaleString('zh-CN') : '-',
      completeTime: order.complete_time ? new Date(order.complete_time).toLocaleString('zh-CN') : '-'
    });
  });

  // 金额列格式化
  const faceValueCol = sheet.getColumn('faceValue');
  const recycleAmountCol = sheet.getColumn('recycleAmount');
  faceValueCol.numFmt = '#,##0.00';
  recycleAmountCol.numFmt = '#,##0.00';

  return workbook;
};

/**
 * 获取卡券类型列表（供筛选下拉框使用）
 */
exports.getCardTypeList = async () => {
  const list = await CardType.findAll({
    where: { status: 'ACTIVE' },
    attributes: ['id', 'name', 'category', 'discount_rate'],
    order: [['sort', 'ASC']],
    raw: true
  });

  return list.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    discountRate: parseFloat(item.discount_rate)
  }));
};

// ========== 已销售资产 ==========

/**
 * 构建已销售资产筛选条件
 */
function buildSoldAssetWhere(params) {
  const where = { status: 'SUCCESS', isSold: true };

  if (params.cardTypeName) {
    where.cardTypeName = params.cardTypeName;
  }

  if (params.minFaceValue || params.maxFaceValue) {
    where.faceValue = {};
    if (params.minFaceValue) where.faceValue[Op.gte] = parseFloat(params.minFaceValue);
    if (params.maxFaceValue) where.faceValue[Op.lte] = parseFloat(params.maxFaceValue);
  }

  // 按售出时间筛选（buy_order.create_time）
  // 在getSoldAssetSummary和getSoldAssetDetail中单独处理

  return where;
}

/**
 * 获取已销售资产汇总统计
 */
exports.getSoldAssetSummary = async (params) => {
  const where = buildSoldAssetWhere(params);

  // 卖家手机号筛选
  if (params.sellerPhone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.sellerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return {
        totalCount: 0,
        totalFaceValue: 0,
        totalBuyAmount: 0,
        cardTypeCount: 0,
        cardTypeSummary: []
      };
    }
    where.userId = { [Op.in]: userIds };
  }

  // 买家手机号筛选
  if (params.buyerPhone) {
    const buyers = await User.findAll({
      where: { phone: { [Op.like]: `%${params.buyerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const buyerIds = buyers.map(u => u.id);
    if (buyerIds.length === 0) {
      return {
        totalCount: 0,
        totalFaceValue: 0,
        totalBuyAmount: 0,
        cardTypeCount: 0,
        cardTypeSummary: []
      };
    }
    const buyOrders = await BuyOrder.findAll({
      where: { buyerId: { [Op.in]: buyerIds } },
      attributes: ['recycleOrderId'],
      raw: true
    });
    const recycleOrderIds = buyOrders.map(bo => bo.recycleOrderId);
    if (recycleOrderIds.length === 0) {
      return {
        totalCount: 0,
        totalFaceValue: 0,
        totalBuyAmount: 0,
        cardTypeCount: 0,
        cardTypeSummary: []
      };
    }
    where.id = { [Op.in]: recycleOrderIds };
  }

  // 售出时间筛选：先查出符合时间条件的buy_order的recycleOrderId
  if (params.startDate || params.endDate) {
    const buyOrderWhere = {};
    if (params.startDate) buyOrderWhere.createTime = { [Op.gte]: new Date(params.startDate) };
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (buyOrderWhere.createTime) {
        buyOrderWhere.createTime[Op.lte] = endDate;
      } else {
        buyOrderWhere.createTime = { [Op.lte]: endDate };
      }
    }
    const timeBuyOrders = await BuyOrder.findAll({
      where: buyOrderWhere,
      attributes: ['recycleOrderId'],
      raw: true
    });
    const timeOrderIds = timeBuyOrders.map(bo => bo.recycleOrderId);
    if (timeOrderIds.length === 0) {
      return {
        totalCount: 0,
        totalFaceValue: 0,
        totalBuyAmount: 0,
        cardTypeCount: 0,
        cardTypeSummary: []
      };
    }
    // 合并条件
    if (where.id) {
      where.id[Op.in] = where.id[Op.in].filter(id => timeOrderIds.includes(id));
    } else {
      where.id = { [Op.in]: timeOrderIds };
    }
  }

  // 全局汇总
  const totalResult = await Order.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('card_type_name'))), 'cardTypeCount']
    ],
    raw: true
  });

  const totalCount = parseInt(totalResult[0]?.totalCount) || 0;
  const totalFaceValue = parseFloat(totalResult[0]?.totalFaceValue) || 0;
  const cardTypeCount = parseInt(totalResult[0]?.cardTypeCount) || 0;

  // 查询所有已售出订单的buyOrderId，汇总buyPrice
  const soldOrders = await Order.findAll({
    where,
    attributes: ['id', 'buyOrderId'],
    raw: true
  });
  const buyOrderIds = soldOrders.map(o => o.buy_order_id).filter(Boolean);
  let totalBuyAmount = 0;
  if (buyOrderIds.length > 0) {
    const buyPriceResult = await BuyOrder.findAll({
      where: { id: { [Op.in]: buyOrderIds } },
      attributes: [[sequelize.fn('SUM', sequelize.col('buy_price')), 'totalBuyPrice']],
      raw: true
    });
    totalBuyAmount = parseFloat(buyPriceResult[0]?.totalBuyPrice) || 0;
  }

  // 按卡券类型分组汇总
  const cardTypeSummary = await Order.findAll({
    where,
    attributes: [
      'card_type_name',
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
      [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount']
    ],
    group: ['card_type_name'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    raw: true
  });

  // 为每种卡券类型计算折扣率、购买金额和面值分布
  const summaryList = await Promise.all(cardTypeSummary.map(async (item) => {
    const itemTotalCount = parseInt(item.totalCount) || 0;
    const itemTotalFaceValue = parseFloat(item.totalFaceValue) || 0;
    const itemTotalRecycleAmount = parseFloat(item.totalRecycleAmount) || 0;
    const avgDiscountRate = itemTotalFaceValue > 0
      ? Math.round(itemTotalRecycleAmount / itemTotalFaceValue * 10000) / 100
      : 0;

    // 查询该类型下已售出订单的buyOrderId
    const typeOrders = await Order.findAll({
      where: { ...where, cardTypeName: item.card_type_name },
      attributes: ['buyOrderId'],
      raw: true
    });
    const typeBuyOrderIds = typeOrders.map(o => o.buy_order_id).filter(Boolean);
    let itemTotalBuyAmount = 0;
    if (typeBuyOrderIds.length > 0) {
      const typeBuyPriceResult = await BuyOrder.findAll({
        where: { id: { [Op.in]: typeBuyOrderIds } },
        attributes: [[sequelize.fn('SUM', sequelize.col('buy_price')), 'totalBuyPrice']],
        raw: true
      });
      itemTotalBuyAmount = parseFloat(typeBuyPriceResult[0]?.totalBuyPrice) || 0;
    }

    // 获取该类型的面值分布
    const faceValueWhere = { ...where, cardTypeName: item.card_type_name };
    const faceValueDistribution = await Order.findAll({
      where: faceValueWhere,
      attributes: [
        'face_value',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
        [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount']
      ],
      group: ['face_value'],
      order: [['face_value', 'ASC']],
      raw: true
    });

    // 为每个面值查询buyPrice
    const faceValueList = await Promise.all(faceValueDistribution.map(async (fv) => {
      const fvOrders = await Order.findAll({
        where: { ...faceValueWhere, faceValue: fv.face_value },
        attributes: ['buyOrderId'],
        raw: true
      });
      const fvBuyOrderIds = fvOrders.map(o => o.buy_order_id).filter(Boolean);
      let fvTotalBuyAmount = 0;
      if (fvBuyOrderIds.length > 0) {
        const fvBuyPriceResult = await BuyOrder.findAll({
          where: { id: { [Op.in]: fvBuyOrderIds } },
          attributes: [[sequelize.fn('SUM', sequelize.col('buy_price')), 'totalBuyPrice']],
          raw: true
        });
        fvTotalBuyAmount = parseFloat(fvBuyPriceResult[0]?.totalBuyPrice) || 0;
      }

      return {
        faceValue: parseFloat(fv.face_value),
        count: parseInt(fv.count) || 0,
        totalFaceValue: parseFloat(fv.totalFaceValue) || 0,
        totalRecycleAmount: parseFloat(fv.totalRecycleAmount) || 0,
        totalBuyAmount: fvTotalBuyAmount
      };
    }));

    // 获取卡券类型ID
    const cardType = await CardType.findOne({
      where: { name: item.card_type_name },
      raw: true
    });

    return {
      cardTypeName: item.card_type_name,
      cardTypeId: cardType ? cardType.id : null,
      totalCount: itemTotalCount,
      totalFaceValue: itemTotalFaceValue,
      totalRecycleAmount: itemTotalRecycleAmount,
      totalBuyAmount: itemTotalBuyAmount,
      avgDiscountRate,
      faceValueDistribution: faceValueList
    };
  }));

  return {
    totalCount,
    totalFaceValue,
    totalBuyAmount,
    cardTypeCount,
    cardTypeSummary: summaryList
  };
};

/**
 * 获取已销售资产明细列表
 */
exports.getSoldAssetDetail = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 20;
  const offset = (page - 1) * pageSize;

  const where = buildSoldAssetWhere(params);

  // 卖家手机号筛选
  if (params.sellerPhone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.sellerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
    where.userId = { [Op.in]: userIds };
  }

  // 买家手机号筛选
  if (params.buyerPhone) {
    const buyers = await User.findAll({
      where: { phone: { [Op.like]: `%${params.buyerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const buyerIds = buyers.map(u => u.id);
    if (buyerIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
    const buyOrders = await BuyOrder.findAll({
      where: { buyerId: { [Op.in]: buyerIds } },
      attributes: ['recycleOrderId'],
      raw: true
    });
    const recycleOrderIds = buyOrders.map(bo => bo.recycleOrderId);
    if (recycleOrderIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
    where.id = { [Op.in]: recycleOrderIds };
  }

  // 售出时间筛选
  if (params.startDate || params.endDate) {
    const buyOrderWhere = {};
    if (params.startDate) buyOrderWhere.createTime = { [Op.gte]: new Date(params.startDate) };
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (buyOrderWhere.createTime) {
        buyOrderWhere.createTime[Op.lte] = endDate;
      } else {
        buyOrderWhere.createTime = { [Op.lte]: endDate };
      }
    }
    const timeBuyOrders = await BuyOrder.findAll({
      where: buyOrderWhere,
      attributes: ['recycleOrderId'],
      raw: true
    });
    const timeOrderIds = timeBuyOrders.map(bo => bo.recycleOrderId);
    if (timeOrderIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
    if (where.id) {
      where.id[Op.in] = where.id[Op.in].filter(id => timeOrderIds.includes(id));
    } else {
      where.id = { [Op.in]: timeOrderIds };
    }
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['complete_time', 'DESC']],
    raw: true
  });

  // 批量获取卖家信息
  const sellerIdList = [...new Set(rows.map(o => o.user_id))];
  const sellerMap = {};
  if (sellerIdList.length > 0) {
    const sellers = await User.findAll({
      where: { id: { [Op.in]: sellerIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    sellers.forEach(u => { sellerMap[u.id] = u; });
  }

  // 批量获取buyOrder信息
  const buyOrderIdList = rows.map(o => o.buy_order_id).filter(Boolean);
  const buyOrderMap = {};
  if (buyOrderIdList.length > 0) {
    const buyOrders = await BuyOrder.findAll({
      where: { id: { [Op.in]: buyOrderIdList } },
      raw: true
    });
    buyOrders.forEach(bo => { buyOrderMap[bo.id] = bo; });
  }

  // 批量获取买家信息
  const buyerIdList = [...new Set(Object.values(buyOrderMap).map(bo => bo.buyer_id))];
  const buyerMap = {};
  if (buyerIdList.length > 0) {
    const buyers = await User.findAll({
      where: { id: { [Op.in]: buyerIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    buyers.forEach(u => { buyerMap[u.id] = u; });
  }

  const list = rows.map(order => {
    const camelOrder = toCamelCase(order);
    try {
      camelOrder.cardNoDecrypt = decrypt(order.card_no);
      camelOrder.cardPwdDecrypt = decrypt(order.card_pwd);
    } catch (e) {
      camelOrder.cardNoDecrypt = '解密失败';
      camelOrder.cardPwdDecrypt = '解密失败';
    }

    // 卖家信息
    const seller = sellerMap[order.user_id];
    if (seller) {
      camelOrder.sellerNickname = seller.nickname;
      camelOrder.sellerPhone = seller.phone;
    }

    // 买家信息和购买信息
    const buyOrder = buyOrderMap[order.buy_order_id];
    if (buyOrder) {
      camelOrder.buyPrice = parseFloat(buyOrder.buy_price);
      camelOrder.buyOrderNo = buyOrder.order_no;
      camelOrder.soldTime = buyOrder.create_time ? new Date(buyOrder.create_time).toLocaleString('zh-CN') : '-';
      const buyer = buyerMap[buyOrder.buyer_id];
      if (buyer) {
        camelOrder.buyerNickname = buyer.nickname;
        camelOrder.buyerPhone = buyer.phone;
      }
    }

    return camelOrder;
  });

  return {
    list,
    total: count,
    page,
    pageSize
  };
};

/**
 * 导出已销售资产Excel
 */
exports.exportSoldAssets = async (params) => {
  const ExcelJS = require('exceljs');
  const where = buildSoldAssetWhere(params);

  // 卖家手机号筛选
  if (params.sellerPhone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.sellerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return null;
    where.userId = { [Op.in]: userIds };
  }

  // 买家手机号筛选
  if (params.buyerPhone) {
    const buyers = await User.findAll({
      where: { phone: { [Op.like]: `%${params.buyerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const buyerIds = buyers.map(u => u.id);
    if (buyerIds.length === 0) return null;
    const buyOrders = await BuyOrder.findAll({
      where: { buyerId: { [Op.in]: buyerIds } },
      attributes: ['recycleOrderId'],
      raw: true
    });
    const recycleOrderIds = buyOrders.map(bo => bo.recycleOrderId);
    if (recycleOrderIds.length === 0) return null;
    where.id = { [Op.in]: recycleOrderIds };
  }

  // 售出时间筛选
  if (params.startDate || params.endDate) {
    const buyOrderWhere = {};
    if (params.startDate) buyOrderWhere.createTime = { [Op.gte]: new Date(params.startDate) };
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (buyOrderWhere.createTime) {
        buyOrderWhere.createTime[Op.lte] = endDate;
      } else {
        buyOrderWhere.createTime = { [Op.lte]: endDate };
      }
    }
    const timeBuyOrders = await BuyOrder.findAll({
      where: buyOrderWhere,
      attributes: ['recycleOrderId'],
      raw: true
    });
    const timeOrderIds = timeBuyOrders.map(bo => bo.recycleOrderId);
    if (timeOrderIds.length === 0) return null;
    if (where.id) {
      where.id[Op.in] = where.id[Op.in].filter(id => timeOrderIds.includes(id));
    } else {
      where.id = { [Op.in]: timeOrderIds };
    }
  }

  const rows = await Order.findAll({
    where,
    order: [['complete_time', 'DESC']],
    raw: true
  });

  if (rows.length === 0) return null;

  // 批量获取卖家信息
  const sellerIdList = [...new Set(rows.map(o => o.user_id))];
  const sellerMap = {};
  if (sellerIdList.length > 0) {
    const sellers = await User.findAll({
      where: { id: { [Op.in]: sellerIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    sellers.forEach(u => { sellerMap[u.id] = u; });
  }

  // 批量获取buyOrder信息
  const buyOrderIdList = rows.map(o => o.buy_order_id).filter(Boolean);
  const buyOrderMap = {};
  if (buyOrderIdList.length > 0) {
    const buyOrders = await BuyOrder.findAll({
      where: { id: { [Op.in]: buyOrderIdList } },
      raw: true
    });
    buyOrders.forEach(bo => { buyOrderMap[bo.id] = bo; });
  }

  // 批量获取买家信息
  const buyerIdList = [...new Set(Object.values(buyOrderMap).map(bo => bo.buyer_id))];
  const buyerMap = {};
  if (buyerIdList.length > 0) {
    const buyers = await User.findAll({
      where: { id: { [Op.in]: buyerIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    buyers.forEach(u => { buyerMap[u.id] = u; });
  }

  // 创建Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('已销售资产明细');

  sheet.columns = [
    { header: '回收订单号', key: 'orderNo', width: 20 },
    { header: '卖家昵称', key: 'sellerNickname', width: 15 },
    { header: '卖家手机号', key: 'sellerPhone', width: 15 },
    { header: '卡券类型', key: 'cardTypeName', width: 15 },
    { header: '卡券面值', key: 'faceValue', width: 12 },
    { header: '回收金额', key: 'recycleAmount', width: 12 },
    { header: '购买价格', key: 'buyPrice', width: 12 },
    { header: '买家昵称', key: 'buyerNickname', width: 15 },
    { header: '买家手机号', key: 'buyerPhone', width: 15 },
    { header: '购买订单号', key: 'buyOrderNo', width: 20 },
    { header: '卡号', key: 'cardNoDecrypt', width: 20 },
    { header: '卡密', key: 'cardPwdDecrypt', width: 20 },
    { header: '完结时间', key: 'completeTime', width: 20 },
    { header: '售出时间', key: 'soldTime', width: 20 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  rows.forEach(order => {
    let cardNoDecrypt, cardPwdDecrypt;
    try {
      cardNoDecrypt = decrypt(order.card_no);
      cardPwdDecrypt = decrypt(order.card_pwd);
    } catch (e) {
      cardNoDecrypt = '解密失败';
      cardPwdDecrypt = '解密失败';
    }

    const seller = sellerMap[order.user_id];
    const buyOrder = buyOrderMap[order.buy_order_id];
    const buyer = buyOrder ? buyerMap[buyOrder.buyer_id] : null;

    sheet.addRow({
      orderNo: order.order_no,
      sellerNickname: seller ? seller.nickname : '-',
      sellerPhone: seller ? seller.phone : '-',
      cardTypeName: order.card_type_name,
      faceValue: parseFloat(order.face_value),
      recycleAmount: parseFloat(order.recycle_amount),
      buyPrice: buyOrder ? parseFloat(buyOrder.buy_price) : 0,
      buyerNickname: buyer ? buyer.nickname : '-',
      buyerPhone: buyer ? buyer.phone : '-',
      buyOrderNo: buyOrder ? buyOrder.order_no : '-',
      cardNoDecrypt,
      cardPwdDecrypt,
      completeTime: order.complete_time ? new Date(order.complete_time).toLocaleString('zh-CN') : '-',
      soldTime: buyOrder && buyOrder.create_time ? new Date(buyOrder.create_time).toLocaleString('zh-CN') : '-'
    });
  });

  const faceValueCol = sheet.getColumn('faceValue');
  const recycleAmountCol = sheet.getColumn('recycleAmount');
  const buyPriceCol = sheet.getColumn('buyPrice');
  faceValueCol.numFmt = '#,##0.00';
  recycleAmountCol.numFmt = '#,##0.00';
  buyPriceCol.numFmt = '#,##0.00';

  return workbook;
};

// ========== 可销售资产 ==========

/**
 * 构建可销售资产筛选条件
 */
function buildAvailableAssetWhere(params) {
  const where = { status: 'SUCCESS', isSold: false };

  if (params.cardTypeName) {
    where.cardTypeName = params.cardTypeName;
  }

  if (params.minFaceValue || params.maxFaceValue) {
    where.faceValue = {};
    if (params.minFaceValue) where.faceValue[Op.gte] = parseFloat(params.minFaceValue);
    if (params.maxFaceValue) where.faceValue[Op.lte] = parseFloat(params.maxFaceValue);
  }

  if (params.startDate || params.endDate) {
    where.completeTime = {};
    if (params.startDate) where.completeTime[Op.gte] = new Date(params.startDate);
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.completeTime[Op.lte] = endDate;
    }
  }

  return where;
}

/**
 * 获取可销售资产汇总统计
 */
exports.getAvailableAssetSummary = async (params) => {
  const where = buildAvailableAssetWhere(params);

  // 卖家手机号筛选
  if (params.sellerPhone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.sellerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return {
        totalCount: 0,
        totalFaceValue: 0,
        estimatedBuyAmount: 0,
        cardTypeCount: 0,
        cardTypeSummary: []
      };
    }
    where.userId = { [Op.in]: userIds };
  }

  // 全局汇总
  const totalResult = await Order.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('card_type_name'))), 'cardTypeCount']
    ],
    raw: true
  });

  const totalCount = parseInt(totalResult[0]?.totalCount) || 0;
  const totalFaceValue = parseFloat(totalResult[0]?.totalFaceValue) || 0;
  const cardTypeCount = parseInt(totalResult[0]?.cardTypeCount) || 0;

  // 计算预估销售金额：需要关联card_type获取discount_rate
  const availableOrders = await Order.findAll({
    where,
    attributes: ['id', 'cardTypeId', 'faceValue'],
    raw: true
  });
  let estimatedBuyAmount = 0;
  if (availableOrders.length > 0) {
    const cardTypeIds = [...new Set(availableOrders.map(o => o.card_type_id).filter(Boolean))];
    const cardTypeMap = {};
    if (cardTypeIds.length > 0) {
      const cardTypes = await CardType.findAll({
        where: { id: { [Op.in]: cardTypeIds } },
        attributes: ['id', 'discountRate'],
        raw: true
      });
      cardTypes.forEach(ct => { cardTypeMap[ct.id] = parseFloat(ct.discount_rate); });
    }
    availableOrders.forEach(order => {
      const discountRate = cardTypeMap[order.card_type_id] || 0;
      estimatedBuyAmount += parseFloat(order.face_value) * discountRate;
    });
    estimatedBuyAmount = Math.round(estimatedBuyAmount * 100) / 100;
  }

  // 按卡券类型分组汇总
  const cardTypeSummary = await Order.findAll({
    where,
    attributes: [
      'card_type_name',
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
      [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount']
    ],
    group: ['card_type_name'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    raw: true
  });

  const summaryList = await Promise.all(cardTypeSummary.map(async (item) => {
    const itemTotalCount = parseInt(item.totalCount) || 0;
    const itemTotalFaceValue = parseFloat(item.totalFaceValue) || 0;
    const itemTotalRecycleAmount = parseFloat(item.totalRecycleAmount) || 0;
    const avgDiscountRate = itemTotalFaceValue > 0
      ? Math.round(itemTotalRecycleAmount / itemTotalFaceValue * 10000) / 100
      : 0;

    // 获取卡券类型信息（折扣率）
    const cardType = await CardType.findOne({
      where: { name: item.card_type_name },
      raw: true
    });
    const discountRate = cardType ? parseFloat(cardType.discount_rate) : 0;
    const itemEstimatedBuyAmount = Math.round(itemTotalFaceValue * discountRate * 100) / 100;

    // 获取该类型的面值分布
    const faceValueWhere = { ...where, cardTypeName: item.card_type_name };
    const faceValueDistribution = await Order.findAll({
      where: faceValueWhere,
      attributes: [
        'face_value',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('face_value')), 'totalFaceValue'],
        [sequelize.fn('SUM', sequelize.col('recycle_amount')), 'totalRecycleAmount']
      ],
      group: ['face_value'],
      order: [['face_value', 'ASC']],
      raw: true
    });

    const faceValueList = faceValueDistribution.map(fv => ({
      faceValue: parseFloat(fv.face_value),
      count: parseInt(fv.count) || 0,
      totalFaceValue: parseFloat(fv.totalFaceValue) || 0,
      totalRecycleAmount: parseFloat(fv.totalRecycleAmount) || 0,
      estimatedBuyAmount: Math.round(parseFloat(fv.face_value) * discountRate * parseInt(fv.count) * 100) / 100
    }));

    return {
      cardTypeName: item.card_type_name,
      cardTypeId: cardType ? cardType.id : null,
      totalCount: itemTotalCount,
      totalFaceValue: itemTotalFaceValue,
      totalRecycleAmount: itemTotalRecycleAmount,
      estimatedBuyAmount: itemEstimatedBuyAmount,
      avgDiscountRate,
      faceValueDistribution: faceValueList
    };
  }));

  return {
    totalCount,
    totalFaceValue,
    estimatedBuyAmount,
    cardTypeCount,
    cardTypeSummary: summaryList
  };
};

/**
 * 获取可销售资产明细列表
 */
exports.getAvailableAssetDetail = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 20;
  const offset = (page - 1) * pageSize;

  const where = buildAvailableAssetWhere(params);

  // 卖家手机号筛选
  if (params.sellerPhone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.sellerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
    where.userId = { [Op.in]: userIds };
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['complete_time', 'DESC']],
    raw: true
  });

  // 批量获取卖家信息
  const sellerIdList = [...new Set(rows.map(o => o.user_id))];
  const sellerMap = {};
  if (sellerIdList.length > 0) {
    const sellers = await User.findAll({
      where: { id: { [Op.in]: sellerIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    sellers.forEach(u => { sellerMap[u.id] = u; });
  }

  // 批量获取卡券类型信息（折扣率）
  const cardTypeIdList = [...new Set(rows.map(o => o.card_type_id).filter(Boolean))];
  const cardTypeMap = {};
  if (cardTypeIdList.length > 0) {
    const cardTypes = await CardType.findAll({
      where: { id: { [Op.in]: cardTypeIdList } },
      attributes: ['id', 'discountRate'],
      raw: true
    });
    cardTypes.forEach(ct => { cardTypeMap[ct.id] = parseFloat(ct.discount_rate); });
  }

  const list = rows.map(order => {
    const camelOrder = toCamelCase(order);
    try {
      camelOrder.cardNoDecrypt = decrypt(order.card_no);
      camelOrder.cardPwdDecrypt = decrypt(order.card_pwd);
    } catch (e) {
      camelOrder.cardNoDecrypt = '解密失败';
      camelOrder.cardPwdDecrypt = '解密失败';
    }

    // 卖家信息
    const seller = sellerMap[order.user_id];
    if (seller) {
      camelOrder.sellerNickname = seller.nickname;
      camelOrder.sellerPhone = seller.phone;
    }

    // 折扣率和预估购买价格
    const discountRate = cardTypeMap[order.card_type_id] || 0;
    camelOrder.discountRate = discountRate;
    camelOrder.buyPrice = Math.round(parseFloat(order.face_value) * discountRate * 100) / 100;

    return camelOrder;
  });

  return {
    list,
    total: count,
    page,
    pageSize
  };
};

/**
 * 导出可销售资产Excel
 */
exports.exportAvailableAssets = async (params) => {
  const ExcelJS = require('exceljs');
  const where = buildAvailableAssetWhere(params);

  // 卖家手机号筛选
  if (params.sellerPhone) {
    const users = await User.findAll({
      where: { phone: { [Op.like]: `%${params.sellerPhone}%` } },
      attributes: ['id'],
      raw: true
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return null;
    where.userId = { [Op.in]: userIds };
  }

  const rows = await Order.findAll({
    where,
    order: [['complete_time', 'DESC']],
    raw: true
  });

  if (rows.length === 0) return null;

  // 批量获取卖家信息
  const sellerIdList = [...new Set(rows.map(o => o.user_id))];
  const sellerMap = {};
  if (sellerIdList.length > 0) {
    const sellers = await User.findAll({
      where: { id: { [Op.in]: sellerIdList } },
      attributes: ['id', 'nickname', 'phone'],
      raw: true
    });
    sellers.forEach(u => { sellerMap[u.id] = u; });
  }

  // 批量获取卡券类型信息
  const cardTypeIdList = [...new Set(rows.map(o => o.card_type_id).filter(Boolean))];
  const cardTypeMap = {};
  if (cardTypeIdList.length > 0) {
    const cardTypes = await CardType.findAll({
      where: { id: { [Op.in]: cardTypeIdList } },
      attributes: ['id', 'discountRate'],
      raw: true
    });
    cardTypes.forEach(ct => { cardTypeMap[ct.id] = parseFloat(ct.discount_rate); });
  }

  // 创建Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('可销售资产明细');

  sheet.columns = [
    { header: '回收订单号', key: 'orderNo', width: 20 },
    { header: '卖家昵称', key: 'sellerNickname', width: 15 },
    { header: '卖家手机号', key: 'sellerPhone', width: 15 },
    { header: '卡券类型', key: 'cardTypeName', width: 15 },
    { header: '卡券面值', key: 'faceValue', width: 12 },
    { header: '回收金额', key: 'recycleAmount', width: 12 },
    { header: '购买折扣', key: 'discountRate', width: 12 },
    { header: '购买价格', key: 'buyPrice', width: 12 },
    { header: '卡号', key: 'cardNoDecrypt', width: 20 },
    { header: '卡密', key: 'cardPwdDecrypt', width: 20 },
    { header: '完结时间', key: 'completeTime', width: 20 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  rows.forEach(order => {
    let cardNoDecrypt, cardPwdDecrypt;
    try {
      cardNoDecrypt = decrypt(order.card_no);
      cardPwdDecrypt = decrypt(order.card_pwd);
    } catch (e) {
      cardNoDecrypt = '解密失败';
      cardPwdDecrypt = '解密失败';
    }

    const seller = sellerMap[order.user_id];
    const discountRate = cardTypeMap[order.card_type_id] || 0;
    const buyPrice = Math.round(parseFloat(order.face_value) * discountRate * 100) / 100;

    sheet.addRow({
      orderNo: order.order_no,
      sellerNickname: seller ? seller.nickname : '-',
      sellerPhone: seller ? seller.phone : '-',
      cardTypeName: order.card_type_name,
      faceValue: parseFloat(order.face_value),
      recycleAmount: parseFloat(order.recycle_amount),
      discountRate: discountRate,
      buyPrice: buyPrice,
      cardNoDecrypt,
      cardPwdDecrypt,
      completeTime: order.complete_time ? new Date(order.complete_time).toLocaleString('zh-CN') : '-'
    });
  });

  const faceValueCol = sheet.getColumn('faceValue');
  const recycleAmountCol = sheet.getColumn('recycleAmount');
  const buyPriceCol = sheet.getColumn('buyPrice');
  faceValueCol.numFmt = '#,##0.00';
  recycleAmountCol.numFmt = '#,##0.00';
  buyPriceCol.numFmt = '#,##0.00';

  return workbook;
};

/**
 * 获取买家订单列表（管理后台）
 */
exports.getBuyOrderList = async (params) => {
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  const where = {};
  if (params.status) where.status = params.status;
  if (params.orderNo) where.orderNo = params.orderNo;
  if (params.buyerId) where.buyerId = params.buyerId;

  if (params.startDate && params.endDate) {
    where.createTime = { [Op.between]: [params.startDate, params.endDate] };
  } else if (params.startDate) {
    where.createTime = { [Op.gte]: params.startDate };
  } else if (params.endDate) {
    where.createTime = { [Op.lte]: params.endDate };
  }

  const { count, rows } = await BuyOrder.findAndCountAll({
    where,
    offset,
    limit: pageSize,
    order: [['create_time', 'DESC']],
    raw: true
  });

  const list = rows.map(order => {
    const camelOrder = toCamelCase(order);
    try {
      camelOrder.cardNoDecrypt = decrypt(order.cardNo || order.card_no);
      camelOrder.cardPwdDecrypt = decrypt(order.cardPwd || order.card_pwd);
    } catch (e) {
      camelOrder.cardNoDecrypt = '解密失败';
      camelOrder.cardPwdDecrypt = '解密失败';
    }
    return camelOrder;
  });

  // 关联买家信息和卖家信息（通过回收订单）
  for (const order of list) {
    const buyer = await User.findByPk(order.buyerId);
    if (buyer) {
      order.buyerPhone = buyer.phone;
      order.buyerNickname = buyer.nickname;
      order.buyerRealName = buyer.realName;
    }
    // 通过回收订单获取卖家信息
    const recycleOrder = await Order.findByPk(order.recycleOrderId);
    if (recycleOrder) {
      const seller = await User.findByPk(recycleOrder.userId);
      if (seller) {
        order.sellerPhone = seller.phone;
        order.sellerNickname = seller.nickname;
        order.sellerRealName = seller.realName;
      }
    }
  }

  return { list, total: count, page, pageSize };
};

/**
 * 获取买家订单详情（管理后台）
 */
exports.getBuyOrderDetail = async (buyOrderId) => {
  const buyOrder = await BuyOrder.findByPk(buyOrderId);
  if (!buyOrder) return null;

  const orderData = toCamelCase(buyOrder.toJSON());

  // 解密卡号卡密
  try {
    orderData.cardNoDecrypt = decrypt(orderData.cardNo);
    orderData.cardPwdDecrypt = decrypt(orderData.cardPwd);
  } catch (e) {
    orderData.cardNoDecrypt = '解密失败';
    orderData.cardPwdDecrypt = '解密失败';
  }

  // 关联买家信息
  const buyer = await User.findByPk(orderData.buyerId);
  if (buyer) {
    orderData.buyerPhone = buyer.phone;
    orderData.buyerNickname = buyer.nickname;
    orderData.buyerRealName = buyer.realName;
  }

  // 关联卖家信息
  const recycleOrder = await Order.findByPk(orderData.recycleOrderId);
  if (recycleOrder) {
    orderData.recycleOrderNo = recycleOrder.orderNo;
    orderData.recycleAmount = recycleOrder.recycleAmount;
    const seller = await User.findByPk(recycleOrder.userId);
    if (seller) {
      orderData.sellerPhone = seller.phone;
      orderData.sellerNickname = seller.nickname;
      orderData.sellerRealName = seller.realName;
    }
  }

  return orderData;
};
