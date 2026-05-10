// src/models/BuyOrder.js - 购买订单模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BuyOrder = sequelize.define('BuyOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'order_no',
    comment: '购买订单号(前缀BUY)'
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'buyer_id',
    comment: '买家用户ID'
  },
  recycleOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'recycle_order_id',
    comment: '关联的回收订单ID'
  },
  cardTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'card_type_id',
    comment: '卡券类型ID'
  },
  cardTypeName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'card_type_name',
    comment: '卡券类型名称'
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
    field: 'discount_rate',
    comment: '购买折扣率'
  },
  buyPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'buy_price',
    comment: '购买价格(面值×折扣率)'
  },
  cardNo: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'card_no',
    comment: '卡号(加密)'
  },
  cardPwd: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'card_pwd',
    comment: '卡密(加密)'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING',
    comment: '状态: PENDING-待支付, PAID-已支付, CANCELLED-已取消'
  },
  payTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'pay_time',
    comment: '支付时间'
  },
  cancelTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancel_time',
    comment: '取消时间'
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
  tableName: 'buy_order',
  timestamps: false
});

module.exports = BuyOrder;