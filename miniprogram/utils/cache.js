// utils/cache.js - 数据缓存工具

const { cache, storageKeys } = require('../config/index');

const CACHE_PREFIX = cache.prefix;
const DEFAULT_EXPIRE = cache.defaultExpire;

/**
 * 设置缓存
 * @param {string} key 缓存key
 * @param {any} data 缓存数据
 * @param {number} expire 过期时间（毫秒）
 */
function set(key, data, expire = DEFAULT_EXPIRE) {
  const cacheData = {
    data,
    expire: Date.now() + expire,
    createTime: Date.now()
  };
  
  try {
    wx.setStorageSync(CACHE_PREFIX + key, cacheData);
    return true;
  } catch (e) {
    console.error('缓存设置失败:', e);
    return false;
  }
}

/**
 * 获取缓存
 * @param {string} key 缓存key
 * @returns {any}
 */
function get(key) {
  try {
    const cacheData = wx.getStorageSync(CACHE_PREFIX + key);
    
    if (!cacheData) return null;
    
    // 检查是否过期
    if (Date.now() > cacheData.expire) {
      remove(key);
      return null;
    }
    
    return cacheData.data;
  } catch (e) {
    console.error('缓存获取失败:', e);
    return null;
  }
}

/**
 * 移除缓存
 * @param {string} key 缓存key
 */
function remove(key) {
  try {
    wx.removeStorageSync(CACHE_PREFIX + key);
    return true;
  } catch (e) {
    console.error('缓存移除失败:', e);
    return false;
  }
}

/**
 * 清除所有缓存
 */
function clearAll() {
  try {
    const res = wx.getStorageInfoSync();
    res.keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        wx.removeStorageSync(key);
      }
    });
    return true;
  } catch (e) {
    console.error('缓存清除失败:', e);
    return false;
  }
}

/**
 * 清除匹配的缓存
 * @param {string} pattern 匹配模式
 */
function clear(pattern) {
  try {
    const res = wx.getStorageInfoSync();
    res.keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX) && key.includes(pattern)) {
        wx.removeStorageSync(key);
      }
    });
    return true;
  } catch (e) {
    console.error('缓存清除失败:', e);
    return false;
  }
}

/**
 * 获取缓存信息
 * @param {string} key 缓存key
 * @returns {Object}
 */
function getInfo(key) {
  try {
    const cacheData = wx.getStorageSync(CACHE_PREFIX + key);
    
    if (!cacheData) return null;
    
    return {
      data: cacheData.data,
      expire: cacheData.expire,
      createTime: cacheData.createTime,
      isExpired: Date.now() > cacheData.expire,
      remainingTime: Math.max(0, cacheData.expire - Date.now())
    };
  } catch (e) {
    return null;
  }
}

/**
 * 更新缓存过期时间
 * @param {string} key 缓存key
 * @param {number} expire 新的过期时间（毫秒）
 */
function updateExpire(key, expire = DEFAULT_EXPIRE) {
  try {
    const cacheData = wx.getStorageSync(CACHE_PREFIX + key);
    
    if (!cacheData) return false;
    
    cacheData.expire = Date.now() + expire;
    wx.setStorageSync(CACHE_PREFIX + key, cacheData);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取存储使用情况
 * @returns {Object}
 */
function getStorageInfo() {
  try {
    const info = wx.getStorageInfoSync();
    const cacheKeys = info.keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    return {
      totalKeys: info.keys.length,
      cacheKeys: cacheKeys.length,
      currentSize: info.currentSize,
      limitSize: info.limitSize,
      usagePercent: ((info.currentSize / info.limitSize) * 100).toFixed(2) + '%'
    };
  } catch (e) {
    return null;
  }
}

module.exports = {
  set,
  get,
  remove,
  clearAll,
  clear,
  getInfo,
  updateExpire,
  getStorageInfo
};
