// utils/userData.js - 用户数据管理工具（按用户ID隔离数据）

const { getUserInfo } = require('./auth');

/**
 * 获取当前用户ID
 * @returns {string|null}
 */
function getCurrentUserId() {
  const userInfo = getUserInfo();
  console.log('[userData] getUserInfo result:', userInfo);

  if (userInfo && userInfo.id) {
    const userId = String(userInfo.id);
    console.log('[userData] getCurrentUserId (by id):', userId);
    return userId;
  }
  // 如果没有用户ID，使用手机号作为标识
  if (userInfo && userInfo.phone) {
    console.log('[userData] getCurrentUserId (by phone):', userInfo.phone);
    return userInfo.phone;
  }
  console.log('[userData] getCurrentUserId: null (no user)');
  return null;
}

/**
 * 获取用户数据存储Key
 * @param {string} key 数据键名
 * @returns {string}
 */
function getUserDataKey(key) {
  const userId = getCurrentUserId();
  if (userId) {
    const dataKey = `${key}_${userId}`;
    console.log('[userData] getUserDataKey:', dataKey);
    return dataKey;
  }
  // 未登录时使用默认key
  console.log('[userData] getUserDataKey (default):', key);
  return key;
}

/**
 * 获取用户订单列表
 * @returns {Array}
 */
function getOrders() {
  const key = getUserDataKey('orders');
  const orders = wx.getStorageSync(key) || [];
  console.log('[userData] getOrders, key:', key, 'count:', orders.length);
  return orders;
}

/**
 * 保存用户订单列表
 * @param {Array} orders 订单列表
 */
function saveOrders(orders) {
  const key = getUserDataKey('orders');
  console.log('[userData] saveOrders, key:', key, 'count:', orders.length);
  wx.setStorageSync(key, orders);
}

/**
 * 添加订单
 * @param {Object} order 订单对象
 */
function addOrder(order) {
  console.log('[userData] addOrder start, order:', order);

  // 获取当前用户信息
  const userInfo = getUserInfo();
  console.log('[userData] addOrder, userInfo:', userInfo);

  const userId = getCurrentUserId();
  console.log('[userData] addOrder, userId:', userId);

  const key = getUserDataKey('orders');
  console.log('[userData] addOrder, storage key:', key);

  const orders = wx.getStorageSync(key) || [];
  console.log('[userData] addOrder, existing orders count:', orders.length);

  orders.unshift(order);
  wx.setStorageSync(key, orders);

  // 验证保存结果
  const savedOrders = wx.getStorageSync(key);
  console.log('[userData] addOrder done, saved orders count:', savedOrders.length);
  console.log('[userData] addOrder done, saved orders:', savedOrders);
}

/**
 * 更新订单
 * @param {string} orderId 订单ID
 * @param {Object} updateData 更新数据
 * @returns {Object|null} 更新后的订单
 */
function updateOrder(orderId, updateData) {
  const orders = getOrders();
  const index = orders.findIndex(item => item.id === orderId);
  
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updateData };
    saveOrders(orders);
    return orders[index];
  }
  return null;
}

/**
 * 获取订单详情
 * @param {string} orderId 订单ID
 * @returns {Object|null}
 */
function getOrderById(orderId) {
  const orders = getOrders();
  return orders.find(item => item.id === orderId) || null;
}

/**
 * 获取用户账户信息
 * @returns {Object}
 */
function getAccount() {
  const key = getUserDataKey('account');
  return wx.getStorageSync(key) || {
    totalRecycle: 0,      // 累计回收金额
    withdrawn: 0,         // 已提现金额
    balance: 0,           // 账户余额 = 累计回收 - 已提现
    orderCount: 0,        // 已完成订单数量
    totalBuy: 0,          // 累计购买金额
    buyOrderCount: 0      // 购买订单数量
  };
}

/**
 * 保存用户账户信息
 * @param {Object} account 账户对象
 */
function saveAccount(account) {
  const key = getUserDataKey('account');
  wx.setStorageSync(key, account);
}

/**
 * 增加回收金额（订单确认完成时调用）
 * @param {number} amount 回收金额
 */
function addRecycleAmount(amount) {
  const account = getAccount();
  account.totalRecycle += amount;
  account.balance = account.totalRecycle - account.withdrawn;
  account.orderCount += 1;
  saveAccount(account);
  return account;
}

/**
 * 提现（减少账户余额）
 * @param {number} amount 提现金额
 * @returns {Object|null} 更新后的账户信息，null表示余额不足
 */
function withdraw(amount) {
  const account = getAccount();
  if (account.balance < amount) {
    return null;
  }
  account.withdrawn += amount;
  account.balance = account.totalRecycle - account.withdrawn;
  saveAccount(account);
  return account;
}

/**
 * 清除当前用户数据
 */
function clearUserData() {
  const userId = getCurrentUserId();
  if (userId) {
    wx.removeStorageSync(`orders_${userId}`);
    wx.removeStorageSync(`account_${userId}`);
  }
}

/**
 * 清除所有用户数据（慎用）
 */
function clearAllUserData() {
  const info = wx.getStorageInfoSync();
  info.keys.forEach(key => {
    if (key.startsWith('orders_') || key.startsWith('account_')) {
      wx.removeStorageSync(key);
    }
  });
}

module.exports = {
  getCurrentUserId,
  getUserDataKey,
  getOrders,
  saveOrders,
  addOrder,
  updateOrder,
  getOrderById,
  getAccount,
  saveAccount,
  addRecycleAmount,
  withdraw,
  clearUserData,
  clearAllUserData
};
