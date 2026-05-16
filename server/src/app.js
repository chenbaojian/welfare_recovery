// src/app.js - 应用入口
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const routes = require('./routes');

const app = express();

// 安全中间件（开发环境放宽CSP，生产环境可收紧）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'self'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: null  // 显式禁用，避免本地HTTP请求被升级为HTTPS
    }
  }
}));

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// 请求日志
app.use(morgan('combined', { stream: logger.stream }));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 管理后台静态文件
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // 生产200次，开发1000次
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});
app.use('/api', limiter);

// API路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务
const PORT = process.env.PORT || 3000;

// 同步数据库模型（仅首次建表时同步，避免 alter 反复添加索引超出 MySQL 64 key 限制）
const sequelize = require('./config/database');
sequelize.sync({ alter: false })
  .then(() => {
    logger.info('数据库同步完成');
    app.listen(PORT, () => {
      logger.info(`服务启动成功，端口: ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV}`);
    });
  })
  .catch(err => {
    logger.error('数据库同步失败:', err);
    // 即使同步失败也启动服务
    app.listen(PORT, () => {
      logger.info(`服务启动成功（数据库同步失败），端口: ${PORT}`);
    });
  });

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，准备关闭服务...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，准备关闭服务...');
  process.exit(0);
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  logger.error('未捕获异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

module.exports = app;