// src/models/Withdraw.js - 提现模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Withdraw = sequelize.define('Withdraw', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  withdrawNo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'withdraw_no',
    comment: '提现单号'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '提现金额'
  },
  bankId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'bank_id',
    comment: '结算账户ID'
  },
  bankName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'bank_name',
    comment: '银行名称'
  },
  bankCardNo: {
    type: DataTypes.STRING(19),
    allowNull: false,
    field: 'bank_card_no',
    comment: '银行卡号'
  },
  realName: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'real_name',
    comment: '持卡人姓名'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING',
    comment: '状态: PENDING-待处理, PROCESSING-处理中, SUCCESS-成功, FAILED-失败'
  },
  failReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'fail_reason',
    comment: '失败原因'
  },
  completeTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'complete_time',
    comment: '完成时间'
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
  tableName: 'withdraw',
  timestamps: false
});

module.exports = Withdraw;