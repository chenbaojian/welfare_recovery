// src/models/Admin.js - 管理员模型
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码(bcrypt加密)'
  },
  realName: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'real_name',
    comment: '真实姓名'
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'OPERATOR',
    comment: '角色: SUPER_ADMIN-超级管理员, ADMIN-管理员, OPERATOR-运营'
  },
  status: {
    type: DataTypes.STRING(10),
    defaultValue: 'ACTIVE',
    comment: '状态: ACTIVE-正常, DISABLED-禁用'
  },
  lastLoginTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_time',
    comment: '最后登录时间'
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
  tableName: 'admin',
  timestamps: false
});

module.exports = Admin;