// src/models/User.js - 用户模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  openId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true,
    field: 'open_id',
    comment: '微信openid'
  },
  sessionKey: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'session_key',
    comment: '微信session_key'
  },
  phone: {
    type: DataTypes.STRING(11),
    allowNull: true,
    unique: true,
    comment: '手机号'
  },
  password: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '密码（MD5加密）'
  },
  nickname: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: '昵称'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '头像'
  },
  realName: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'real_name',
    comment: '真实姓名'
  },
  idCard: {
    type: DataTypes.STRING(18),
    allowNull: true,
    unique: true,
    field: 'id_card',
    comment: '身份证号'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified',
    comment: '是否实名认证'
  },
  verifyTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verify_time',
    comment: '认证时间'
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '账户余额'
  },
  totalRecycle: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_recycle',
    comment: '累计回收金额'
  },
  orderCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'order_count',
    comment: '订单数量'
  },
  currentMode: {
    type: DataTypes.STRING(10),
    defaultValue: 'SELLER',
    field: 'current_mode',
    comment: '当前模式: SELLER-我要卖卡, BUYER-我是买家'
  },
  totalBuy: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_buy',
    comment: '累计购买金额'
  },
  buyOrderCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'buy_order_count',
    comment: '购买订单数量'
  },
  loginType: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'login_type',
    comment: '登录方式'
  },
  status: {
    type: DataTypes.STRING(10),
    defaultValue: 'ACTIVE',
    comment: '状态: ACTIVE-正常, DISABLED-禁用'
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
  tableName: 'user',
  timestamps: false
});

module.exports = User;