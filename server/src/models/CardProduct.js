// src/models/CardProduct.js - 卡产品模型（具体卡名称）
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CardProduct = sequelize.define('CardProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cardTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'card_type_id',
    comment: '所属卡类型ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '具体卡名称'
  },
  // faceValues, discountRate, buyDiscountRate, isHot, isSaleable 已拆分到 card_product_face_value 子表
  // 以下字段暂时保留以兼容过渡期，后续删除
  faceValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'face_values',
    comment: '支持的面值（已废弃，迁移至card_product_face_value表）'
  },
  discountRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.95,
    field: 'discount_rate',
    comment: '收卡折扣率（已废弃，迁移至card_product_face_value表）'
  },
  buyDiscountRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.95,
    field: 'buy_discount_rate',
    comment: '卖卡折扣率（已废弃，迁移至card_product_face_value表）'
  },
  sort: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序'
  },
  status: {
    type: DataTypes.STRING(10),
    defaultValue: 'ACTIVE',
    comment: '状态: ACTIVE-启用, DISABLED-禁用'
  },
  isHot: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
    field: 'is_hot',
    comment: '是否热门: 1-是, 0-否（卡产品级别）'
  },
  createTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'create_time'
  },
  updateTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'update_time'
  }
}, {
  tableName: 'card_product',
  timestamps: false
});

// 关联关系
CardProduct.associate = (models) => {
  CardProduct.belongsTo(models.CardType, { foreignKey: 'cardTypeId', as: 'cardType' });
  CardProduct.hasMany(models.CardProductFaceValue, { foreignKey: 'cardProductId', as: 'faceValueDetails' });
};

module.exports = CardProduct;
