// src/services/card.js - 卡券服务
const CardType = require('../models/CardType');
const CardProduct = require('../models/CardProduct');
const CardProductFaceValue = require('../models/CardProductFaceValue');

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
 * 获取某类型下的卡产品列表
 */
exports.getTypeProducts = async (typeId) => {
  const type = await CardType.findByPk(typeId);
  if (!type) {
    throw new Error('卡券类型不存在');
  }

  const products = await CardProduct.findAll({
    where: { cardTypeId: typeId, status: 'ACTIVE' },
    order: [['sort', 'ASC']],
    attributes: ['id', 'name', 'isHot', 'sort']
  });

  // 将卡类型的图标附加到每个卡产品上
  const result = products.map(p => ({
    ...p.toJSON(),
    icon: type.icon || '🎫',
    iconUrl: type.iconUrl || null,
    iconColor: type.iconColor || null,
    iconBgColor: type.iconBgColor || null
  }));

  return result;
};

/**
 * 计算回收金额
 * 优先从面值明细表获取折扣率，否则使用卡类型默认折扣率
 */
exports.calculateAmount = async (cardTypeId, faceValue, cardProductId) => {
  const card = await CardType.findByPk(cardTypeId);

  if (!card) {
    throw new Error('卡券类型不存在');
  }

  // 优先从面值明细表获取折扣率
  let discountRate = card.discountRate;
  if (cardProductId) {
    const fvDetail = await CardProductFaceValue.findOne({
      where: { cardProductId, faceValue, status: 'ACTIVE' }
    });
    if (fvDetail) {
      discountRate = parseFloat(fvDetail.discountRate);
    }
  } else {
    // 尝试通过 cardTypeId 查找匹配的卡产品面值
    const cardProducts = await CardProduct.findAll({
      where: { cardTypeId, status: 'ACTIVE' },
      attributes: ['id'],
      raw: true
    });
    if (cardProducts.length > 0) {
      const productIds = cardProducts.map(p => p.id);
      const fvDetail = await CardProductFaceValue.findOne({
        where: {
          cardProductId: { [require('sequelize').Op.in]: productIds },
          faceValue,
          status: 'ACTIVE'
        },
        raw: true
      });
      if (fvDetail) {
        discountRate = parseFloat(fvDetail.discountRate);
      }
    }
  }

  // 计算回收金额
  const recycleAmount = (faceValue * discountRate).toFixed(2);

  return {
    faceValue,
    discountRate,
    recycleAmount,
    fee: 0
  };
};