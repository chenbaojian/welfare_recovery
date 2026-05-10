// utils/util.js - 通用工具函数

/**
 * 格式化日期
 * @param {Date|string|number} date 日期
 * @param {string} format 格式
 * @returns {string}
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化金额
 * @param {number} amount 金额
 * @param {number} decimals 小数位数
 * @returns {string}
 */
function formatMoney(amount, decimals = 2) {
  if (amount === null || amount === undefined) return '0.00';
  
  const num = Number(amount);
  
  if (isNaN(num)) return '0.00';
  
  return num.toFixed(decimals);
}

/**
 * 格式化金额（带千分位）
 * @param {number} amount 金额
 * @param {number} decimals 小数位数
 * @returns {string}
 */
function formatMoneyWithComma(amount, decimals = 2) {
  const formatted = formatMoney(amount, decimals);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * 格式化折扣率
 * @param {number} rate 折扣率（0-1）
 * @returns {string}
 */
function formatDiscount(rate) {
  if (rate === null || rate === undefined) return '0折';
  
  const num = Number(rate);
  
  if (isNaN(num)) return '0折';
  
  return (num * 10).toFixed(1) + '折';
}

/**
 * 格式化百分比
 * @param {number} value 值（0-1）
 * @param {number} decimals 小数位数
 * @returns {string}
 */
function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined) return '0%';
  
  const num = Number(value);
  
  if (isNaN(num)) return '0%';
  
  return (num * 100).toFixed(decimals) + '%';
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化手机号（带空格）
 * @param {string} phone 手机号
 * @returns {string}
 */
function formatPhone(phone) {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
}

/**
 * 格式化银行卡号（带空格）
 * @param {string} cardNo 银行卡号
 * @returns {string}
 */
function formatBankCard(cardNo) {
  if (!cardNo) return cardNo;
  return cardNo.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * 延迟执行
 * @param {number} ms 毫秒数
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 * @param {Function} fn 函数
 * @param {number} delay 延迟时间
 * @returns {Function}
 */
function debounce(fn, delay = 300) {
  let timer = null;
  
  return function(...args) {
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn 函数
 * @param {number} interval 间隔时间
 * @returns {Function}
 */
function throttle(fn, interval = 300) {
  let lastTime = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 深拷贝
 * @param {Object} obj 对象
 * @returns {Object}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  
  const clone = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  
  return clone;
}

/**
 * 判断是否为空对象
 * @param {Object} obj 对象
 * @returns {boolean}
 */
function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  
  if (typeof obj === 'string') return obj.trim() === '';
  
  if (Array.isArray(obj)) return obj.length === 0;
  
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  
  return false;
}

/**
 * 获取URL参数
 * @param {string} url URL
 * @returns {Object}
 */
function getUrlParams(url) {
  const params = {};
  const queryString = url.split('?')[1];
  
  if (!queryString) return params;
  
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    params[key] = decodeURIComponent(value);
  });
  
  return params;
}

/**
 * 对象转URL参数
 * @param {Object} obj 对象
 * @returns {string}
 */
function objectToUrlParams(obj) {
  return Object.keys(obj)
    .map(key => `${key}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

/**
 * 获取随机颜色
 * @returns {string}
 */
function getRandomColor() {
  const colors = [
    '#1890FF', '#52C41A', '#FAAD14', '#F5222D',
    '#722ED1', '#13C2C2', '#EB2F96', '#FA541C'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 检查是否为微信环境
 * @returns {boolean}
 */
function isWechat() {
  return true; // 小程序环境始终为true
}

/**
 * 检查是否为iOS
 * @returns {boolean}
 */
function isIOS() {
  const systemInfo = wx.getSystemInfoSync();
  return systemInfo.platform === 'ios';
}

/**
 * 检查是否为Android
 * @returns {boolean}
 */
function isAndroid() {
  const systemInfo = wx.getSystemInfoSync();
  return systemInfo.platform === 'android';
}

/**
 * 比较版本号
 * @param {string} v1 版本1
 * @param {string} v2 版本2
 * @returns {number} 1: v1>v2, 0: v1=v2, -1: v1<v2
 */
function compareVersion(v1, v2) {
  const parts1 = v1.split('.');
  const parts2 = v2.split('.');
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parseInt(parts1[i] || 0);
    const num2 = parseInt(parts2[i] || 0);
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
}

module.exports = {
  formatDate,
  formatMoney,
  formatMoneyWithComma,
  formatDiscount,
  formatPercent,
  formatFileSize,
  formatPhone,
  formatBankCard,
  delay,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  getUrlParams,
  objectToUrlParams,
  getRandomColor,
  isWechat,
  isIOS,
  isAndroid,
  compareVersion
};