// src/controllers/admin.js - 管理后台控制器
const adminService = require('../services/admin');
const logger = require('../utils/logger');

/**
 * 管理员登录
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({
        code: 400,
        message: '用户名和密码不能为空'
      });
    }

    const result = await adminService.login(username, password);

    res.json({
      code: 200,
      message: '登录成功',
      data: result
    });
  } catch (err) {
    logger.error('管理员登录失败:', err);
    res.json({
      code: 401,
      message: err.message
    });
  }
};

/**
 * 获取管理员信息
 */
exports.getAdminInfo = async (req, res, next) => {
  try {
    res.json({
      code: 200,
      data: req.admin
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 获取统计数据（首页）
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    res.json({
      code: 200,
      data: stats
    });
  } catch (err) {
    logger.error('获取统计数据失败:', err);
    next(err);
  }
};

/**
 * 获取订单列表
 */
exports.getOrderList = async (req, res, next) => {
  try {
    const result = await adminService.getOrderList(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取订单列表失败:', err);
    next(err);
  }
};

/**
 * 获取订单详情
 */
exports.getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.query;
    const order = await adminService.getOrderDetail(id);

    if (!order) {
      return res.json({
        code: 30001,
        message: '订单不存在'
      });
    }

    res.json({
      code: 200,
      data: order
    });
  } catch (err) {
    logger.error('获取订单详情失败:', err);
    next(err);
  }
};

/**
 * 完结订单（确认）
 */
exports.completeOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const adminId = req.admin.adminId;

    if (!orderId) {
      return res.json({
        code: 400,
        message: '订单ID不能为空'
      });
    }

    const result = await adminService.completeOrder(orderId, adminId);

    res.json({
      code: 200,
      message: '订单已完结，金额已入账',
      data: result
    });
  } catch (err) {
    logger.error('完结订单失败:', err);
    res.json({
      code: 30002,
      message: err.message
    });
  }
};

/**
 * 拒绝订单
 */
exports.rejectOrder = async (req, res, next) => {
  try {
    const { orderId, failReason } = req.body;
    const adminId = req.admin.adminId;

    if (!orderId) {
      return res.json({
        code: 400,
        message: '订单ID不能为空'
      });
    }

    const result = await adminService.rejectOrder(orderId, adminId, failReason);

    res.json({
      code: 200,
      message: '订单已拒绝',
      data: result
    });
  } catch (err) {
    logger.error('拒绝订单失败:', err);
    res.json({
      code: 30002,
      message: err.message
    });
  }
};

/**
 * 获取用户列表
 */
exports.getUserList = async (req, res, next) => {
  try {
    const result = await adminService.getUserList(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取用户列表失败:', err);
    next(err);
  }
};

/**
 * 获取用户详情
 */
exports.getUserDetail = async (req, res, next) => {
  try {
    const { id } = req.query;
    const result = await adminService.getUserDetail(id);

    if (!result) {
      return res.json({
        code: 10001,
        message: '用户不存在'
      });
    }

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取用户详情失败:', err);
    next(err);
  }
};

// ========== 回收资产 ==========

/**
 * 获取回收资产汇总统计
 */
exports.getAssetSummary = async (req, res, next) => {
  try {
    const result = await adminService.getAssetSummary(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取回收资产汇总失败:', err);
    next(err);
  }
};

/**
 * 获取回收资产明细列表
 */
exports.getAssetDetail = async (req, res, next) => {
  try {
    const result = await adminService.getAssetDetail(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取回收资产明细失败:', err);
    next(err);
  }
};

/**
 * 导出回收资产Excel
 */
exports.exportAssets = async (req, res, next) => {
  try {
    // 检查导出权限：仅SUPER_ADMIN和ADMIN可导出
    if (req.admin.role === 'OPERATOR') {
      return res.json({
        code: 403,
        message: '仅管理员可导出数据'
      });
    }

    const workbook = await adminService.exportAssets(req.query);

    if (!workbook) {
      return res.json({
        code: 400,
        message: '当前筛选条件下无数据可导出'
      });
    }

    // 设置响应头
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=回收资产_${dateStr}.xlsx`);

    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('导出回收资产失败:', err);
    next(err);
  }
};

/**
 * 获取卡券类型列表
 */
exports.getCardTypeList = async (req, res, next) => {
  try {
    const list = await adminService.getCardTypeList();

    res.json({
      code: 200,
      data: list
    });
  } catch (err) {
    logger.error('获取卡券类型列表失败:', err);
    next(err);
  }
};

// ========== 已销售资产 ==========

/**
 * 获取已销售资产汇总统计
 */
exports.getSoldAssetSummary = async (req, res, next) => {
  try {
    const result = await adminService.getSoldAssetSummary(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取已销售资产汇总失败:', err);
    next(err);
  }
};

/**
 * 获取已销售资产明细列表
 */
exports.getSoldAssetDetail = async (req, res, next) => {
  try {
    const result = await adminService.getSoldAssetDetail(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取已销售资产明细失败:', err);
    next(err);
  }
};

/**
 * 导出已销售资产Excel
 */
exports.exportSoldAssets = async (req, res, next) => {
  try {
    // 检查导出权限：仅SUPER_ADMIN和ADMIN可导出
    if (req.admin.role === 'OPERATOR') {
      return res.json({
        code: 403,
        message: '仅管理员可导出数据'
      });
    }

    const workbook = await adminService.exportSoldAssets(req.query);

    if (!workbook) {
      return res.json({
        code: 400,
        message: '当前筛选条件下无数据可导出'
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=已销售资产_${dateStr}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('导出已销售资产失败:', err);
    next(err);
  }
};

// ========== 可销售资产 ==========

/**
 * 获取可销售资产汇总统计
 */
exports.getAvailableAssetSummary = async (req, res, next) => {
  try {
    const result = await adminService.getAvailableAssetSummary(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取可销售资产汇总失败:', err);
    next(err);
  }
};

/**
 * 获取可销售资产明细列表
 */
exports.getAvailableAssetDetail = async (req, res, next) => {
  try {
    const result = await adminService.getAvailableAssetDetail(req.query);

    res.json({
      code: 200,
      data: result
    });
  } catch (err) {
    logger.error('获取可销售资产明细失败:', err);
    next(err);
  }
};

/**
 * 导出可销售资产Excel
 */
exports.exportAvailableAssets = async (req, res, next) => {
  try {
    // 检查导出权限：仅SUPER_ADMIN和ADMIN可导出
    if (req.admin.role === 'OPERATOR') {
      return res.json({
        code: 403,
        message: '仅管理员可导出数据'
      });
    }

    const workbook = await adminService.exportAvailableAssets(req.query);

    if (!workbook) {
      return res.json({
        code: 400,
        message: '当前筛选条件下无数据可导出'
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=可销售资产_${dateStr}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('导出可销售资产失败:', err);
    next(err);
  }
};

/**
 * 获取买家订单列表
 */
exports.getBuyOrderList = async (req, res, next) => {
  try {
    const result = await adminService.getBuyOrderList(req.query);
    res.json({ code: 200, data: result });
  } catch (err) {
    logger.error('获取买家订单列表失败:', err);
    next(err);
  }
};

/**
 * 获取买家订单详情
 */
exports.getBuyOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ code: 400, message: '订单ID不能为空' });
    }
    const order = await adminService.getBuyOrderDetail(id);
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
    res.json({ code: 200, data: order });
  } catch (err) {
    logger.error('获取买家订单详情失败:', err);
    next(err);
  }
};
