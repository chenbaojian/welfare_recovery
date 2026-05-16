// src/services/admin.js - 管理后台服务
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const User = require('../models/User');
const CardType = require('../models/CardType');
const CardProduct = require('../models/CardProduct');
const CardProductFaceValue = require('../models/CardProductFaceValue');
const BalanceLog = require('../models/BalanceLog');
const BuyOrder = require('../models/BuyOrder');
const { decrypt } = require('../utils/crypto');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const sequelize = require('../config/database');
const { Sequelize, Op } = require('sequelize');
const promotionService = require('./promotion');

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

    // 触发推广交易奖励（异步，不影响主流程）
    promotionService.grantTradeReward(order.userId, order.id).catch(err => {
      logger.error(`推广交易奖励发放失败: userId=${order.userId}, orderId=${order.id}`, err);
    });

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
    attributes: ['id', 'name', 'category', 'icon', 'icon_url', 'icon_color', 'icon_bg_color', 'discount_rate', 'buy_discount_rate', 'sort', 'status'],
    order: [['sort', 'ASC']],
    raw: true
  });

  return list.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    icon: item.icon,
    iconUrl: item.icon_url,
    iconColor: item.icon_color,
    iconBgColor: item.icon_bg_color,
    discountRate: parseFloat(item.discount_rate),
    buyDiscountRate: parseFloat(item.buy_discount_rate),
    sort: item.sort,
    status: item.status
  }));
};

/**
 * 获取所有卡券类型列表（管理页面用，含已禁用）
 */
exports.getAllCardTypeList = async () => {
  const list = await CardType.findAll({
    attributes: ['id', 'name', 'category', 'icon', 'icon_url', 'icon_color', 'icon_bg_color', 'discount_rate', 'buy_discount_rate', 'face_values', 'sort', 'status'],
    order: [['sort', 'ASC']],
    raw: true
  });

  return list.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    icon: item.icon,
    iconUrl: item.icon_url,
    iconColor: item.icon_color,
    iconBgColor: item.icon_bg_color,
    discountRate: parseFloat(item.discount_rate),
    buyDiscountRate: parseFloat(item.buy_discount_rate),
    faceValues: item.face_values,
    sort: item.sort,
    status: item.status
  }));
};

/**
 * 更新卡券类型折扣率
 */
exports.updateCardTypeDiscount = async (id, discountRate, buyDiscountRate) => {
  const cardType = await CardType.findByPk(id);
  if (!cardType) {
    throw new Error('卡券类型不存在');
  }

  const updateData = {};
  if (discountRate !== undefined && discountRate !== null) {
    const rate = parseFloat(discountRate);
    if (rate < 0 || rate > 1) {
      throw new Error('收卡折扣率必须在0-1之间');
    }
    updateData.discountRate = rate;
  }
  if (buyDiscountRate !== undefined && buyDiscountRate !== null) {
    const rate = parseFloat(buyDiscountRate);
    if (rate < 0 || rate > 1) {
      throw new Error('卖卡折扣率必须在0-1之间');
    }
    updateData.buyDiscountRate = rate;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('没有需要更新的折扣率');
  }

  await CardType.update(updateData, { where: { id } });

  const updated = await CardType.findByPk(id);
  return {
    id: updated.id,
    name: updated.name,
    discountRate: parseFloat(updated.discountRate),
    buyDiscountRate: parseFloat(updated.buyDiscountRate)
  };
};

/**
 * 更新卡券类型图标
 */
exports.updateCardTypeIcon = async (id, iconUrl, iconColor, iconBgColor) => {
  const cardType = await CardType.findByPk(id);
  if (!cardType) {
    throw new Error('卡券类型不存在');
  }

  const updateData = {
    iconUrl: iconUrl || null,
    iconColor: iconColor || null,
    iconBgColor: iconBgColor || null
  };

  await CardType.update(updateData, { where: { id } });

  const updated = await CardType.findByPk(id);
  return {
    id: updated.id,
    name: updated.name,
    icon: updated.icon,
    iconUrl: updated.iconUrl,
    iconColor: updated.iconColor,
    iconBgColor: updated.iconBgColor
  };
};

/**
 * 切换卡券类型状态（启用/禁用）
 */
exports.toggleCardTypeStatus = async (id) => {
  const cardType = await CardType.findByPk(id);
  if (!cardType) {
    throw new Error('卡券类型不存在');
  }

  const newStatus = cardType.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  await CardType.update({ status: newStatus }, { where: { id } });

  return {
    id: cardType.id,
    name: cardType.name,
    status: newStatus
  };
};

/**
 * 删除卡券类型
 */
exports.deleteCardType = async (id) => {
  const cardType = await CardType.findByPk(id);
  if (!cardType) {
    throw new Error('卡券类型不存在');
  }

  // 检查是否有关联的卡券
  const Card = require('../models/Card');
  const cardCount = await Card.count({ where: { cardTypeId: id } });
  if (cardCount > 0) {
    throw new Error(`该卡券类型下有 ${cardCount} 张卡券，无法删除，请先禁用`);
  }

  // 级联删除关联的卡产品面值和卡产品
  const products = await CardProduct.findAll({ where: { cardTypeId: id }, attributes: ['id'], raw: true });
  if (products.length > 0) {
    const productIds = products.map(p => p.id);
    await CardProductFaceValue.destroy({ where: { cardProductId: productIds } });
    await CardProduct.destroy({ where: { cardTypeId: id } });
    logger.info(`删除卡类型${id}，级联删除${productIds.length}个卡产品及其面值`);
  }

  await CardType.destroy({ where: { id } });
  return { id, name: cardType.name };
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

  // 计算预估销售金额：需要关联card_type获取buy_discount_rate
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
        attributes: ['id', 'buyDiscountRate'],
        raw: true
      });
      cardTypes.forEach(ct => { cardTypeMap[ct.id] = parseFloat(ct.buy_discount_rate); });
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

    // 获取卡券类型信息（卖卡折扣率）
    const cardType = await CardType.findOne({
      where: { name: item.card_type_name },
      raw: true
    });
    const discountRate = cardType ? parseFloat(cardType.buy_discount_rate) : 0;
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
      attributes: ['id', 'buyDiscountRate'],
      raw: true
    });
    cardTypes.forEach(ct => { cardTypeMap[ct.id] = parseFloat(ct.buy_discount_rate); });
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
      attributes: ['id', 'buyDiscountRate'],
      raw: true
    });
    cardTypes.forEach(ct => { cardTypeMap[ct.id] = parseFloat(ct.buy_discount_rate); });
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

// ========== 卡产品管理 ==========

/**
 * 更新卡产品折扣
 */
exports.updateCardProductDiscount = async (id, discountRate, buyDiscountRate, isHot, isSaleable, faceValues) => {
  const updateData = {};
  if (discountRate !== undefined) updateData.discountRate = discountRate;
  if (buyDiscountRate !== undefined) updateData.buyDiscountRate = buyDiscountRate;
  if (isHot !== undefined) updateData.isHot = isHot;
  if (isSaleable !== undefined) updateData.isSaleable = isSaleable;
  if (faceValues !== undefined) updateData.faceValues = faceValues;

  const [affected] = await CardProduct.update(updateData, { where: { id } });
  // affected为0时可能是值未变化，只要没抛异常就视为成功
  return affected > 0 || Object.keys(updateData).length > 0;
};

/**
 * 切换卡产品状态
 */
exports.toggleCardProductStatus = async (id) => {
  const product = await CardProduct.findByPk(id);
  if (!product) return null;

  const newStatus = product.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  await CardProduct.update({ status: newStatus }, { where: { id } });
  return { id, status: newStatus };
};

/**
 * 切换卡产品热门状态
 */
exports.toggleCardProductHot = async (id) => {
  const product = await CardProduct.findByPk(id);
  if (!product) return null;

  const newIsHot = product.isHot === 1 ? 0 : 1;
  await CardProduct.update({ isHot: newIsHot }, { where: { id } });
  return { id, isHot: newIsHot };
};

/**
 * 新增卡产品
 */
exports.createCardProduct = async (data) => {
  const { cardTypeId, typeName, name, sort, status, isHot } = data;

  let finalCardTypeId = cardTypeId;

  // 如果传了typeName，根据名称查找或创建卡类型
  if (typeName && !cardTypeId) {
    let cardType = await CardType.findOne({ where: { name: typeName } });
    if (!cardType) {
      // 自动创建新的卡类型
      const maxSort = await CardType.max('sort') || 0;
      cardType = await CardType.create({
        name: typeName,
        sort: maxSort + 1,
        status: 'ACTIVE'
      });
      logger.info(`自动创建卡类型: ${typeName}, id=${cardType.id}`);
    }
    finalCardTypeId = cardType.id;
  }

  // 校验卡类型是否存在
  const cardType = await CardType.findByPk(finalCardTypeId);
  if (!cardType) {
    throw new Error('卡类型不存在');
  }

  // 检查同类型下是否已存在同名卡产品
  const existing = await CardProduct.findOne({ where: { cardTypeId: finalCardTypeId, name } });
  if (existing) {
    throw new Error('该卡类型下已存在同名卡产品');
  }

  const product = await CardProduct.create({
    cardTypeId: finalCardTypeId,
    name,
    sort: sort || 0,
    status: status || 'ACTIVE',
    isHot: isHot || 0
  });

  return {
    id: product.id,
    cardTypeId: product.cardTypeId,
    cardTypeName: cardType.name,
    name: product.name,
    faceValueCount: 0,
    isHot: product.isHot,
    sort: product.sort,
    status: product.status
  };
};

/**
 * 删除卡产品
 */
exports.deleteCardProduct = async (id) => {
  const product = await CardProduct.findByPk(id);
  if (!product) return null;
  // 先删除面值明细
  await CardProductFaceValue.destroy({ where: { cardProductId: id } });
  await CardProduct.destroy({ where: { id } });
  return product;
};

/**
 * 获取卡产品列表（支持筛选和分页）
 * @param {Object} filters - { keyword, cardTypeName, status, page, pageSize }
 */
exports.getAllCardProductList = async (filters = {}) => {
  const { keyword, cardTypeName, status, isHot, isSaleable } = filters;
  const page = parseInt(filters.page) || 1;
  const pageSize = parseInt(filters.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  // 先获取卡类型名称映射
  const cardTypes = await CardType.findAll({
    attributes: ['id', 'name'],
    raw: true
  });
  const typeMap = {};
  cardTypes.forEach(t => { typeMap[t.id] = t.name; });

  // 如果按类型名称筛选，先找出匹配的 cardTypeId
  let cardTypeIds = null;
  if (cardTypeName) {
    cardTypeIds = Object.entries(typeMap)
      .filter(([, name]) => name === cardTypeName)
      .map(([id]) => parseInt(id));
    if (cardTypeIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }
  }

  // 构建查询条件
  const where = {};
  if (cardTypeIds) where.cardTypeId = { [Op.in]: cardTypeIds };
  if (status) where.status = status;

  // isHot 筛选：直接查卡产品表
  if (isHot !== undefined && isHot !== '' && isHot !== null) {
    where.isHot = parseInt(isHot);
  }
  // isSaleable 筛选：查找有可售面值的卡产品
  if (isSaleable !== undefined && isSaleable !== '' && isSaleable !== null) {
    const saleableProductIds = await CardProductFaceValue.findAll({
      where: { isSaleable: parseInt(isSaleable) },
      attributes: ['cardProductId'],
      group: ['cardProductId'],
      raw: true
    });
    if (where.id) {
      // 与 isHot 筛选取交集
      const existingIds = where.id[Op.in] || [];
      where.id = { [Op.in]: existingIds.filter(id => saleableProductIds.map(r => r.cardProductId).includes(id)) };
    } else {
      where.id = { [Op.in]: saleableProductIds.map(r => r.cardProductId) };
    }
  }

  // 关键字搜索需要用 Op.like
  if (keyword) {
    where.name = { [Op.like]: `%${keyword}%` };
  }

  const { count, rows } = await CardProduct.findAndCountAll({
    attributes: ['id', 'cardTypeId', 'name', 'sort', 'status', 'isHot'],
    where,
    offset,
    limit: pageSize,
    order: [['cardTypeId', 'ASC'], ['sort', 'ASC']],
    raw: true
  });

  // 批量获取面值数量
  const productIds = rows.map(r => r.id);
  const faceValueCounts = await CardProductFaceValue.findAll({
    where: { cardProductId: { [Op.in]: productIds } },
    attributes: ['cardProductId', [sequelize.fn('COUNT', sequelize.col('id')), 'faceValueCount']],
    group: ['cardProductId'],
    raw: true
  });
  const countMap = {};
  faceValueCounts.forEach(r => { countMap[r.cardProductId] = parseInt(r.faceValueCount); });

  const list = rows.map(item => ({
    id: item.id,
    cardTypeId: item.cardTypeId,
    cardTypeName: typeMap[item.cardTypeId] || '未知类型',
    name: item.name,
    faceValueCount: countMap[item.id] || 0,
    isHot: item.isHot,
    sort: item.sort,
    status: item.status
  }));

  return {
    list,
    total: count,
    page,
    pageSize
  };
};


// ========== 卡产品面值明细管理 ==========

/**
 * 获取卡产品面值明细列表
 */
exports.getCardProductFaceValues = async (cardProductId) => {
  const product = await CardProduct.findByPk(cardProductId);
  if (!product) return null;

  const faceValues = await CardProductFaceValue.findAll({
    where: { cardProductId },
    order: [['sort', 'ASC'], ['faceValue', 'ASC']],
    raw: true
  });

  return {
    cardProduct: {
      id: product.id,
      name: product.name,
      cardTypeId: product.cardTypeId,
      status: product.status,
      isHot: product.isHot
    },
    faceValues: faceValues.map(fv => ({
      id: fv.id,
      cardProductId: fv.cardProductId,
      faceValue: parseFloat(fv.faceValue),
      discountRate: parseFloat(fv.discountRate),
      buyDiscountRate: parseFloat(fv.buyDiscountRate),
      isSaleable: fv.isSaleable,
      sort: fv.sort,
      status: fv.status
    }))
  };
};

/**
 * 批量保存卡产品面值明细（事务）
 */
exports.batchSaveCardProductFaceValues = async (cardProductId, faceValues) => {
  const product = await CardProduct.findByPk(cardProductId);
  if (!product) throw new Error('卡产品不存在');

  let saved = 0;
  let deleted = 0;

  await sequelize.transaction(async (t) => {
    for (const fv of faceValues) {
      // 标记删除
      if (fv.deleted && fv.id) {
        await CardProductFaceValue.destroy({ where: { id: fv.id, cardProductId }, transaction: t });
        deleted++;
        continue;
      }

      // 校验
      if (fv.faceValue === undefined || fv.faceValue === null || fv.faceValue === '') {
        throw new Error('面值金额不能为空');
      }
      if (fv.discountRate === undefined || fv.discountRate < 0 || fv.discountRate > 1) {
        throw new Error('收卡折扣率必须在0-1之间');
      }
      if (fv.buyDiscountRate === undefined || fv.buyDiscountRate < 0 || fv.buyDiscountRate > 1) {
        throw new Error('卖卡折扣率必须在0-1之间');
      }

      if (fv.id) {
        // 更新
        await CardProductFaceValue.update({
          faceValue: fv.faceValue,
          discountRate: fv.discountRate,
          buyDiscountRate: fv.buyDiscountRate,
          isSaleable: fv.isSaleable !== undefined ? fv.isSaleable : 1,
          sort: fv.sort || 0,
          status: fv.status || 'ACTIVE'
        }, { where: { id: fv.id, cardProductId }, transaction: t });
        saved++;
      } else {
        // 新增 - 检查同面值是否已存在
        const existing = await CardProductFaceValue.findOne({
          where: { cardProductId, faceValue: fv.faceValue },
          transaction: t
        });
        if (existing) {
          throw new Error(`面值${fv.faceValue}已存在，不能重复添加`);
        }

        await CardProductFaceValue.create({
          cardProductId,
          faceValue: fv.faceValue,
          discountRate: fv.discountRate,
          buyDiscountRate: fv.buyDiscountRate,
          isSaleable: fv.isSaleable !== undefined ? fv.isSaleable : 1,
          sort: fv.sort || 0,
          status: fv.status || 'ACTIVE'
        }, { transaction: t });
        saved++;
      }
    }
  });

  return { saved, deleted };
};

/**
 * 获取可售面值列表（小程序购买端）
 */
exports.getSaleableFaceValues = async (cardProductId) => {
  const product = await CardProduct.findByPk(cardProductId);
  if (!product || product.status !== 'ACTIVE') return { isHot: 0, faceValues: [] };

  const faceValues = await CardProductFaceValue.findAll({
    where: {
      cardProductId,
      isSaleable: 1,
      status: 'ACTIVE'
    },
    order: [['sort', 'ASC'], ['faceValue', 'ASC']],
    raw: true
  });

  return {
    isHot: product.isHot,
    faceValues: faceValues.map(fv => ({
      faceValue: parseFloat(fv.faceValue),
      buyDiscountRate: parseFloat(fv.buyDiscountRate),
      buyPrice: parseFloat((fv.faceValue * fv.buyDiscountRate).toFixed(2)),
      isSaleable: fv.isSaleable
    }))
  };
};

/**
 * 获取回收面值列表（小程序回收端）
 */
exports.getRecycleFaceValues = async (cardProductId) => {
  const product = await CardProduct.findByPk(cardProductId);
  if (!product || product.status !== 'ACTIVE') return { isHot: 0, faceValues: [] };

  const faceValues = await CardProductFaceValue.findAll({
    where: {
      cardProductId,
      status: 'ACTIVE'
    },
    order: [['sort', 'ASC'], ['faceValue', 'ASC']],
    raw: true
  });

  return {
    isHot: product.isHot,
    faceValues: faceValues.map(fv => ({
      faceValue: parseFloat(fv.faceValue),
      discountRate: parseFloat(fv.discountRate),
      recycleAmount: parseFloat((fv.faceValue * fv.discountRate).toFixed(2)),
      isSaleable: fv.isSaleable
    }))
  };
};

/**
 * 根据卡产品ID和面值获取面值明细（交易流程用）
 */
exports.getFaceValueDetail = async (cardProductId, faceValue) => {
  const fv = await CardProductFaceValue.findOne({
    where: { cardProductId, faceValue, status: 'ACTIVE' },
    raw: true
  });
  if (!fv) return null;
  return {
    id: fv.id,
    faceValue: parseFloat(fv.faceValue),
    discountRate: parseFloat(fv.discountRate),
    buyDiscountRate: parseFloat(fv.buyDiscountRate),
    isHot: fv.isHot,
    isSaleable: fv.isSaleable,
    status: fv.status
  };
};
