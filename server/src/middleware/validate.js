// src/middleware/validate.js - 参数验证中间件
const { validationResult } = require('express-validator');

/**
 * 验证结果处理中间件
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    console.log('验证失败详情:', JSON.stringify(errors.array()));

    return res.json({
      code: 400,
      message: errorMessages[0],
      errors: errors.array()
    });
  }

  next();
};