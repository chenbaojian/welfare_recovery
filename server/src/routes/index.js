// src/routes/index.js - 路由入口
const express = require('express');
const router = express.Router();

const userRoutes = require('./user');
const cardRoutes = require('./card');
const orderRoutes = require('./order');
const withdrawRoutes = require('./withdraw');
const bankRoutes = require('./bank');
const commonRoutes = require('./common');
const adminRoutes = require('./admin');
const buyRoutes = require('./buy');
const promotionRoutes = require('./promotion');

// 用户相关路由
router.use('/user', userRoutes);

// 卡券相关路由
router.use('/card', cardRoutes);

// 订单相关路由
router.use('/order', orderRoutes);

// 提现相关路由
router.use('/withdraw', withdrawRoutes);

// 结算账户相关路由
router.use('/bank', bankRoutes);

// 公共路由
router.use('/common', commonRoutes);

// 管理后台路由
router.use('/admin', adminRoutes);

// 买家模式路由
router.use('/buy', buyRoutes);

// 推广相关路由
router.use('/promotion', promotionRoutes);

module.exports = router;