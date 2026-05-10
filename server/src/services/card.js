// src/services/card.js - 卡券服务
const CardType = require('../models/CardType');

/**
 * 获取卡券类型列表
 */
exports.getTypeList = async () => {
  const list = await CardType.findAll({
    where: { status: 'ACTIVE' },
    order: [['sort', 'ASC']]
  });
  
  return list;
};

/**
 * 获取卡券详情
 */
exports.getDetail = async (id) => {
  const card = await CardType.findByPk(id);
  return card;
};

/**
 * 计算回收金额
 */
exports.calculateAmount = async (cardTypeId, faceValue) => {
  const card = await CardType.findByPk(cardTypeId);
  
  if (!card) {
    throw new Error('卡券类型不存在');
  }
  
  // 检查面值是否支持
  const faceValues = card.faceValues || [];
  if (faceValues.length > 0 && !faceValues.includes(faceValue)) {
    throw new Error('该面值不在支持范围内');
  }
  
  // 计算回收金额
  const recycleAmount = (faceValue * card.discountRate).toFixed(2);
  
  return {
    faceValue,
    discountRate: card.discountRate,
    recycleAmount,
    fee: 0
  };
};