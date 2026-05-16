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

/**
 * 获取所有卡券类型列表（管理页面用，含已禁用）
 */
exports.getAllCardTypeList = async (req, res, next) => {
  try {
    const list = await adminService.getAllCardTypeList();
    res.json({ code: 200, data: list });
  } catch (err) {
    logger.error('获取所有卡券类型列表失败:', err);
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

/**
 * 更新卡券类型折扣率
 */
exports.updateCardTypeDiscount = async (req, res, next) => {
  try {
    const { id, discountRate, buyDiscountRate } = req.body;

    if (!id) {
      return res.json({ code: 400, message: '卡券类型ID不能为空' });
    }

    const result = await adminService.updateCardTypeDiscount(id, discountRate, buyDiscountRate);

    res.json({
      code: 200,
      message: '折扣率更新成功',
      data: result
    });
  } catch (err) {
    logger.error('更新卡券类型折扣率失败:', err);
    res.json({
      code: 500,
      message: err.message
    });
  }
};

/**
 * 更新卡券类型图标
 */
exports.updateCardTypeIcon = async (req, res, next) => {
  try {
    const { id, iconUrl, iconColor, iconBgColor } = req.body;

    if (!id) {
      return res.json({ code: 400, message: '卡券类型ID不能为空' });
    }

    const result = await adminService.updateCardTypeIcon(id, iconUrl, iconColor, iconBgColor);

    res.json({
      code: 200,
      message: '图标更新成功',
      data: result
    });
  } catch (err) {
    logger.error('更新卡券类型图标失败:', err);
    res.json({
      code: 500,
      message: err.message
    });
  }
};

/**
 * 切换卡券类型状态
 */
exports.toggleCardTypeStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.json({ code: 400, message: '卡券类型ID不能为空' });
    }

    const result = await adminService.toggleCardTypeStatus(id);
    res.json({
      code: 200,
      message: result.status === 'ACTIVE' ? '已启用' : '已禁用',
      data: result
    });
  } catch (err) {
    logger.error('切换卡券类型状态失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 删除卡券类型
 */
exports.deleteCardType = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.json({ code: 400, message: '卡券类型ID不能为空' });
    }

    const result = await adminService.deleteCardType(id);
    res.json({
      code: 200,
      message: `卡券类型「${result.name}」已删除`,
      data: result
    });
  } catch (err) {
    logger.error('删除卡券类型失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

// ========== 卡产品管理 ==========

/**
 * 新增卡产品
 */
exports.createCardProduct = async (req, res, next) => {
  try {
    const { cardTypeId, typeName, name, sort, status, isHot } = req.body;

    // 支持两种方式：直接传cardTypeId，或传typeName自动匹配/创建
    if (!cardTypeId && !typeName) {
      return res.json({ code: 400, message: '请输入类型名称' });
    }
    if (!name || !name.trim()) {
      return res.json({ code: 400, message: '请输入名称' });
    }

    const result = await adminService.createCardProduct({
      cardTypeId,
      typeName: typeName ? typeName.trim() : null,
      name: name.trim(),
      sort,
      status,
      isHot
    });

    res.json({ code: 200, message: '新增成功', data: result });
  } catch (err) {
    logger.error('新增卡产品失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 获取卡产品列表（支持筛选和分页）
 */
exports.getAllCardProductList = async (req, res, next) => {
  try {
    const { keyword, cardTypeName, status, isHot, isSaleable, hasHotFaceValue, hasSaleableFaceValue, page, pageSize } = req.query;
    logger.info('卡产品列表请求参数:', JSON.stringify(req.query));
    const result = await adminService.getAllCardProductList({
      keyword, cardTypeName, status,
      isHot: hasHotFaceValue !== undefined ? hasHotFaceValue : isHot,
      isSaleable: hasSaleableFaceValue !== undefined ? hasSaleableFaceValue : isSaleable,
      page, pageSize
    });
    res.json({ code: 200, data: result });
  } catch (err) {
    logger.error('获取卡产品列表失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 更新卡产品折扣
 */
exports.updateCardProductDiscount = async (req, res, next) => {
  try {
    const { id, discountRate, buyDiscountRate, isHot, isSaleable, faceValues } = req.body;
    if (!id) {
      return res.json({ code: 400, message: '缺少卡产品ID' });
    }
    const success = await adminService.updateCardProductDiscount(id, discountRate, buyDiscountRate, isHot, isSaleable, faceValues);
    res.json({ code: 200, message: success ? '更新成功' : '更新失败' });
  } catch (err) {
    logger.error('更新卡产品折扣失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 切换卡产品状态
 */
exports.toggleCardProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.toggleCardProductStatus(id);
    if (!result) {
      return res.json({ code: 404, message: '卡产品不存在' });
    }
    res.json({
      code: 200,
      message: result.status === 'ACTIVE' ? '已启用' : '已禁用',
      data: result
    });
  } catch (err) {
    logger.error('切换卡产品状态失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 切换卡产品热门状态
 */
exports.toggleCardProductHot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.toggleCardProductHot(id);
    if (!result) {
      return res.json({ code: 404, message: '卡产品不存在' });
    }
    res.json({
      code: 200,
      message: result.isHot === 1 ? '已设为热门' : '已取消热门',
      data: result
    });
  } catch (err) {
    logger.error('切换卡产品热门状态失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 删除卡产品
 */
exports.deleteCardProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteCardProduct(id);
    if (!result) {
      return res.json({ code: 404, message: '卡产品不存在' });
    }
    res.json({
      code: 200,
      message: `卡产品「${result.name}」已删除`,
      data: result
    });
  } catch (err) {
    logger.error('删除卡产品失败:', err);
    res.json({ code: 500, message: err.message });
  }
};


// ========== 卡产品面值明细管理 ==========

/**
 * 获取卡产品面值明细列表
 */
exports.getCardProductFaceValues = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.getCardProductFaceValues(id);
    if (!result) {
      return res.json({ code: 404, message: '卡产品不存在' });
    }
    res.json({ code: 200, message: '查询成功', data: result });
  } catch (err) {
    logger.error('获取面值明细失败:', err);
    res.json({ code: 500, message: err.message });
  }
};

/**
 * 批量保存卡产品面值明细
 */
exports.batchSaveCardProductFaceValues = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { faceValues } = req.body;
    if (!faceValues || !Array.isArray(faceValues)) {
      return res.json({ code: 400, message: '面值数据格式错误' });
    }
    const result = await adminService.batchSaveCardProductFaceValues(id, faceValues);
    res.json({ code: 200, message: '保存成功', data: result });
  } catch (err) {
    logger.error('批量保存面值明细失败:', err);
    res.json({ code: 500, message: err.message });
  }
};
