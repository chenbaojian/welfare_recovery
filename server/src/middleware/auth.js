// src/middleware/auth.js - 认证中间件
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 验证token中间件
 */
exports.auth = async (req, res, next) => {
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
    
    // 检查用户是否存在
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        code: 10001,
        message: '用户不存在，请重新登录'
      });
    }
    
    if (user.status === 'DISABLED') {
      return res.json({
        code: 10002,
        message: '用户已被禁用'
      });
    }
    
    // 将用户信息挂载到请求对象
    req.user = decoded;
    
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
 * 验证实名认证中间件
 */
exports.verified = async (req, res, next) => {
  try {
    // 开发环境下跳过实名认证检查
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const user = await User.findByPk(req.user.userId);

    if (!user.isVerified) {
      return res.json({
        code: 403,
        message: '请先完成实名认证'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};