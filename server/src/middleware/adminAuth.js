// src/middleware/adminAuth.js - 管理后台认证中间件
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * 管理员token验证中间件
 */
exports.adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({
        code: 401,
        message: '未登录或登录已过期'
      });
    }

    const token = authHeader.split(' ')[1];

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 检查是否是管理员token
    if (!decoded.adminId) {
      return res.json({
        code: 403,
        message: '无管理员权限'
      });
    }

    // 检查管理员是否存在
    const admin = await Admin.findByPk(decoded.adminId);

    if (!admin) {
      return res.json({
        code: 401,
        message: '管理员不存在'
      });
    }

    if (admin.status === 'DISABLED') {
      return res.json({
        code: 403,
        message: '管理员已被禁用'
      });
    }

    // 将管理员信息挂载到请求对象
    req.admin = {
      adminId: admin.id,
      username: admin.username,
      realName: admin.realName,
      role: admin.role
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.json({
        code: 401,
        message: 'token无效'
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.json({
        code: 401,
        message: '登录已过期'
      });
    }

    next(err);
  }
};

/**
 * 超级管理员权限中间件
 */
exports.superAdminOnly = async (req, res, next) => {
  if (req.admin.role !== 'SUPER_ADMIN') {
    return res.json({
      code: 403,
      message: '仅超级管理员可执行此操作'
    });
  }
  next();
};