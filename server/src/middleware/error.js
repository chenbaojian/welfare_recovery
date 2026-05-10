// src/middleware/error.js - 错误处理中间件

/**
 * 404处理
 */
exports.notFoundHandler = (req, res, next) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  });
};

/**
 * 全局错误处理
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('错误:', err);
  
  // 参数验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: err.message,
      errors: err.errors
    });
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: 'token无效'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: '登录已过期'
    });
  }
  
  // 数据库错误
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      code: 400,
      message: '数据已存在'
    });
  }
  
  // 默认错误
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message
  });
};