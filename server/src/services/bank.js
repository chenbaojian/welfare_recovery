// src/services/bank.js - 结算账户服务
const Bank = require('../models/Bank');
const { Op } = require('sequelize');

/**
 * 账户列表
 */
exports.list = async (userId) => {
  const list = await Bank.findAll({
    where: { userId },
    order: [['is_default', 'DESC'], ['create_time', 'DESC']]
  });

  return list;
};

/**
 * 账户数量
 */
exports.count = async (userId) => {
  const count = await Bank.count({
    where: { userId }
  });
  
  return count;
};

/**
 * 根据卡号查找
 */
exports.findByCardNo = async (userId, cardNo) => {
  return await Bank.findOne({
    where: { userId, cardNo }
  });
};

/**
 * 添加账户
 */
exports.add = async (data) => {
  const { userId, bankCode, bankName, cardNo, realName } = data;
  
  // 检查是否是第一个账户，自动设为默认
  const count = await this.count(userId);
  
  const bank = await Bank.create({
    userId,
    bankCode,
    bankName,
    cardNo,
    realName,
    isDefault: count === 0
  });
  
  return bank;
};

/**
 * 更新账户
 */
exports.update = async (id, userId, data) => {
  return await Bank.update(data, {
    where: { id, userId }
  });
};

/**
 * 删除账户
 */
exports.delete = async (id, userId) => {
  const bank = await Bank.findOne({
    where: { id, userId }
  });
  
  if (!bank) {
    throw new Error('账户不存在');
  }
  
  // 如果删除的是默认账户，需要设置其他账户为默认
  if (bank.isDefault) {
    const otherBank = await Bank.findOne({
      where: { userId, id: { [Op.ne]: id } }
    });
    
    if (otherBank) {
      await Bank.update(
        { isDefault: true },
        { where: { id: otherBank.id } }
      );
    }
  }
  
  await Bank.destroy({
    where: { id, userId }
  });
};

/**
 * 设置默认账户
 */
exports.setDefault = async (id, userId) => {
  // 先取消所有默认
  await Bank.update(
    { isDefault: false },
    { where: { userId } }
  );
  
  // 设置新的默认
  await Bank.update(
    { isDefault: true },
    { where: { id, userId } }
  );
};