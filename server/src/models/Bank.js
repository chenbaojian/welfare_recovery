// src/models/Bank.js - 结算账户模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bank = sequelize.define('Bank', {
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
  bankCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'bank_code',
    comment: '银行代码'
  },
  bankName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'bank_name',
    comment: '银行名称'
  },
  cardNo: {
    type: DataTypes.STRING(19),
    allowNull: false,
    field: 'card_no',
    comment: '银行卡号'
  },
  realName: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'real_name',
    comment: '持卡人姓名'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default',
    comment: '是否默认'
  },
  status: {
    type: DataTypes.STRING(10),
    defaultValue: 'ACTIVE',
    comment: '状态'
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
  tableName: 'bank',
  timestamps: false
});

module.exports = Bank;