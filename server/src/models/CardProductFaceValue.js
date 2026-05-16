// src/models/CardProductFaceValue.js - 卡产品面值明细模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CardProductFaceValue = sequelize.define('CardProductFaceValue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cardProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'card_product_id',
    comment: '所属卡产品ID'
  },
  faceValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'face_value',
    comment: '面值金额'
  },
  discountRate: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0.95,
    field: 'discount_rate',
    comment: '收卡折扣率'
  },
  buyDiscountRate: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0.95,
    field: 'buy_discount_rate',
    comment: '卖卡折扣率'
  },
  isSaleable: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    field: 'is_saleable',
    comment: '是否销售: 1-是, 0-否'
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
  tableName: 'card_product_face_value',
  timestamps: false
});

// 关联关系
CardProductFaceValue.associate = (models) => {
  CardProductFaceValue.belongsTo(models.CardProduct, {
    foreignKey: 'cardProductId',
    as: 'cardProduct'
  });
};

module.exports = CardProductFaceValue;
