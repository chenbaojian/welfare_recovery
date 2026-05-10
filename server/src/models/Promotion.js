// src/models/Promotion.js - 推广关系模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  promoterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'promoter_id',
    comment: '推广人用户ID'
  },
  newUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'new_user_id',
    comment: '被推广新用户ID（唯一，一人一绑）'
  },
  registerReward: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'register_reward',
    comment: '注册奖励金额'
  },
  registerRewardStatus: {
    type: DataTypes.STRING(10),
    defaultValue: 'PENDING',
    field: 'register_reward_status',
    comment: '注册奖励状态: PENDING-待发放, PAID-已发放, FAILED-发放失败'
  },
  registerRewardTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'register_reward_time',
    comment: '注册奖励发放时间'
  },
  tradeReward: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'trade_reward',
    comment: '交易奖励金额'
  },
  tradeRewardStatus: {
    type: DataTypes.STRING(10),
    defaultValue: 'PENDING',
    field: 'trade_reward_status',
    comment: '交易奖励状态: PENDING-待发放, PAID-已发放, FAILED-发放失败'
  },
  tradeRewardTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'trade_reward_time',
    comment: '交易奖励发放时间'
  },
  tradeOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'trade_order_id',
    comment: '触发交易奖励的订单ID'
  },
  status: {
    type: DataTypes.STRING(10),
    defaultValue: 'ACTIVE',
    comment: '状态: ACTIVE-正常, FROZEN-冻结, RECALLED-收回'
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
  tableName: 'promotion',
  timestamps: false,
  indexes: [
    {
      name: 'idx_promoter_id',
      fields: ['promoter_id']
    },
    {
      name: 'idx_new_user_id',
      unique: true,
      fields: ['new_user_id']
    }
  ]
});

// 关联定义
const User = require('./User');
Promotion.belongsTo(User, { foreignKey: 'promoterId', as: 'promoter' });
Promotion.belongsTo(User, { foreignKey: 'newUserId', as: 'newUser' });

module.exports = Promotion;
