// src/controllers/bank.js - 结算账户控制器
const bankService = require('../services/bank');
const logger = require('../utils/logger');

/**
 * 账户列表
 */
exports.list = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    const list = await bankService.list(userId);
    
    res.json({
      code: 200,
      data: list
    });
  } catch (err) {
    logger.error('获取账户列表失败:', err);
    next(err);
  }
};

/**
 * 添加账户
 */
exports.add = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bankCode, bankName, cardNo, realName } = req.body;
    
    // 检查账户数量限制
    const count = await bankService.count(userId);
    if (count >= 5) {
      return res.json({
        code: 400,
        message: '最多只能添加5个结算账户'
      });
    }
    
    // 检查银行卡是否已添加
    const exist = await bankService.findByCardNo(userId, cardNo);
    if (exist) {
      return res.json({
        code: 400,
        message: '该银行卡已添加'
      });
    }
    
    const bank = await bankService.add({
      userId,
      bankCode,
      bankName,
      cardNo,
      realName
    });
    
    res.json({
      code: 200,
      message: '添加成功',
      data: bank
    });
  } catch (err) {
    logger.error('添加账户失败:', err);
    next(err);
  }
};

/**
 * 更新账户
 */
exports.update = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id, ...data } = req.body;
    
    await bankService.update(id, userId, data);
    
    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (err) {
    logger.error('更新账户失败:', err);
    next(err);
  }
};

/**
 * 删除账户
 */
exports.delete = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bankId } = req.body;
    
    await bankService.delete(bankId, userId);
    
    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (err) {
    logger.error('删除账户失败:', err);
    next(err);
  }
};

/**
 * 设置默认账户
 */
exports.setDefault = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bankId } = req.body;
    
    await bankService.setDefault(bankId, userId);
    
    res.json({
      code: 200,
      message: '设置成功'
    });
  } catch (err) {
    logger.error('设置默认账户失败:', err);
    next(err);
  }
};