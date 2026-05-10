// src/models/BalanceLog.js - 余额流水模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BalanceLog = sequelize.define('BalanceLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'order_id',
    comment: '关联订单ID'
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '类型: RECYCLE_INCOME-回收收入, WITHDRAW-提现支出, ADMIN_ADJUST-管理员调整, PROMOTION_REGISTER-推广注册奖励, PROMOTION_TRADE-推广交易奖励, PROMOTION_RECALL-推广奖励收回'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '变动金额(正数增加,负数减少)'
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'balance_before',
    comment: '变动前余额'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'balance_after',
    comment: '变动后余额'
  },
  remark: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '备注'
  },
  operatorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'operator_id',
    comment: '操作人ID(管理员调整时)'
  },
  createTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'create_time'
  }
}, {
  tableName: 'balance_log',
  timestamps: false
});

module.exports = BalanceLog;