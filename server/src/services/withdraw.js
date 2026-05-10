// src/services/withdraw.js - 提现服务
const { v4: uuidv4 } = require('uuid');
const Withdraw = require('../models/Withdraw');
const User = require('../models/User');
const Bank = require('../models/Bank');

/**
 * 生成提现单号
 */
const generateWithdrawNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `W${year}${month}${day}${random}`;
};

/**
 * 创建提现
 */
exports.create = async (data) => {
  const { userId, amount, bankId } = data;
  
  // 获取用户信息
  const user = await User.findByPk(userId);
  
  if (user.balance < amount) {
    throw new Error('余额不足');
  }
  
  // 获取结算账户
  const bank = await Bank.findOne({
    where: { id: bankId, userId }
  });
  
  if (!bank) {
    throw new Error('结算账户不存在');
  }
  
  // 创建提现记录
  const withdraw = await Withdraw.create({
    withdrawNo: generateWithdrawNo(),
    userId,
    amount,
    bankId,
    bankName: bank.bankName,
    bankCardNo: bank.cardNo,
    realName: bank.realName,
    status: 'PENDING'
  });
  
  // 扣减用户余额
  await User.decrement(
    { balance: amount },
    { where: { id: userId } }
  );
  
  // 异步处理提现
  processWithdraw(withdraw.id);
  
  return withdraw;
};

/**
 * 异步处理提现
 */
const processWithdraw = async (withdrawId) => {
  try {
    // 更新状态为处理中
    await Withdraw.update(
      { status: 'PROCESSING' },
      { where: { id: withdrawId } }
    );
    
    // 这里应该调用第三方支付接口
    // 模拟处理
    setTimeout(async () => {
      await Withdraw.update(
        { 
          status: 'SUCCESS',
          completeTime: new Date()
        },
        { where: { id: withdrawId } }
      );
    }, 5000);
  } catch (err) {
    console.error('处理提现失败:', err);
  }
};

/**
 * 提现列表
 */
exports.list = async (params) => {
  const userId = params.userId;
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 10;
  const offset = (page - 1) * pageSize;
  
  const { count, rows } = await Withdraw.findAndCountAll({
    where: { userId },
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
 * 提现详情
 */
exports.detail = async (id, userId) => {
  const withdraw = await Withdraw.findOne({
    where: { id, userId }
  });
  
  return withdraw;
};