// src/models/Order.js - 订单模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
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
    comment: '订单号'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
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
  recycleAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'recycle_amount',
    comment: '回收金额'
  },
  cardNo: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'card_no',
    comment: '卡号(加密)'
  },
  cardPwd: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'card_pwd',
    comment: '卡密(加密)'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING',
    comment: '状态: PENDING-待处理, PROCESSING-处理中, SUCCESS-成功, FAILED-失败, CANCELLED-已取消'
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
  isSold: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_sold',
    comment: '是否已售出: false-未售出(可被买家购买), true-已售出(已被购买)'
  },
  buyOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'buy_order_id',
    comment: '关联的购买订单ID'
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
  tableName: 'order',
  timestamps: false
});

module.exports = Order;