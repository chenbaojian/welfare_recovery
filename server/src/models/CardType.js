// src/models/CardType.js - 卡券类型模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CardType = sequelize.define('CardType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '名称'
  },
  category: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '分类'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '描述'
  },
  icon: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '图标（emoji或文字，兼容旧数据）'
  },
  iconUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'icon_url',
    comment: '图标图片URL（后台可配置，优先于icon字段）'
  },
  iconColor: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'icon_color',
    comment: '图标文字颜色（后台可配置）'
  },
  iconBgColor: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'icon_bg_color',
    comment: '图标背景颜色（后台可配置）'
  },
  discountRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.95,
    field: 'discount_rate',
    comment: '收卡折扣率'
  },
  buyDiscountRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.95,
    field: 'buy_discount_rate',
    comment: '卖卡折扣率'
  },
  faceValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'face_values',
    comment: '支持的面值'
  },
  cardNoMinLength: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'card_no_min_length',
    comment: '卡号最小长度'
  },
  cardNoMaxLength: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    field: 'card_no_max_length',
    comment: '卡号最大长度'
  },
  cardPwdMinLength: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    field: 'card_pwd_min_length',
    comment: '卡密最小长度'
  },
  cardPwdMaxLength: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    field: 'card_pwd_max_length',
    comment: '卡密最大长度'
  },
  notice: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '注意事项'
  },
  isHot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_hot',
    comment: '是否热门'
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
  tableName: 'card_type',
  timestamps: false
});

module.exports = CardType;