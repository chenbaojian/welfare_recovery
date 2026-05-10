// src/utils/jwt.js - JWT工具
const jwt = require('jsonwebtoken');

/**
 * 生成token
 */
exports.generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * 验证token
 */
exports.verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * 解析token（不验证）
 */
exports.decodeToken = (token) => {
  return jwt.decode(token);
};