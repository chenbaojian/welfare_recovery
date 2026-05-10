// src/controllers/common.js - 公共控制器
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * 文件上传
 */
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.json({
        code: 400,
        message: '请选择文件'
      });
    }
    
    // 生成文件URL
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      code: 200,
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (err) {
    logger.error('文件上传失败:', err);
    next(err);
  }
};

/**
 * 获取配置
 */
exports.getConfig = async (req, res, next) => {
  try {
    const config = {
      minWithdraw: 10,
      maxWithdraw: 5000,
      withdrawFee: 0,
      servicePhone: '400-xxx-xxxx'
    };
    
    res.json({
      code: 200,
      data: config
    });
  } catch (err) {
    logger.error('获取配置失败:', err);
    next(err);
  }
};

/**
 * 意见反馈
 */
exports.feedback = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { content, contact } = req.body;
    
    // 保存反馈（实际应存入数据库）
    logger.info(`用户反馈 [${userId}]: ${content}`);
    
    res.json({
      code: 200,
      message: '感谢您的反馈'
    });
  } catch (err) {
    logger.error('提交反馈失败:', err);
    next(err);
  }
};