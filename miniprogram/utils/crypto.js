// utils/crypto.js - 加密工具

/**
 * 简单的Base64编码（用于前端展示，实际加密应在后端进行）
 */
const Base64 = {
  encode(str) {
    // 小程序环境使用内置方法或手动实现
    try {
      return wx.base64encode ? wx.base64encode(str) : btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return str;
    }
  },
  decode(str) {
    try {
      return wx.base64decode ? wx.base64decode(str) : decodeURIComponent(escape(atob(str)));
    } catch (e) {
      return str;
    }
  }
};

/**
 * 手机号脱敏
 * @param {string} phone 手机号
 * @returns {string}
 */
function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 身份证号脱敏
 * @param {string} idCard 身份证号
 * @returns {string}
 */
function maskIdCard(idCard) {
  if (!idCard || idCard.length !== 18) return idCard;
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
}

/**
 * 银行卡号脱敏
 * @param {string} cardNo 银行卡号
 * @returns {string}
 */
function maskBankCard(cardNo) {
  if (!cardNo || cardNo.length < 8) return cardNo;
  const start = cardNo.substring(0, 4);
  const end = cardNo.substring(cardNo.length - 4);
  const middle = '*'.repeat(cardNo.length - 8);
  return start + middle + end;
}

/**
 * 姓名脱敏
 * @param {string} name 姓名
 * @returns {string}
 */
function maskName(name) {
  if (!name) return name;
  if (name.length === 2) {
    return name[0] + '*';
  }
  if (name.length >= 3) {
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  }
  return name;
}

/**
 * 简单的字符串加密（用于本地存储）
 * @param {string} str 原字符串
 * @param {string} key 密钥
 * @returns {string}
 */
function simpleEncrypt(str, key = 'welfare-recovery') {
  if (!str) return '';
  
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  
  return Base64.encode(result);
}

/**
 * 简单的字符串解密（用于本地存储）
 * @param {string} str 加密字符串
 * @param {string} key 密钥
 * @returns {string}
 */
function simpleDecrypt(str, key = 'welfare-recovery') {
  if (!str) return '';
  
  try {
    const decoded = Base64.decode(str);
    let result = '';
    
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch (e) {
    return '';
  }
}

/**
 * 生成随机字符串
 * @param {number} length 长度
 * @returns {string}
 */
function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 生成订单号
 * @returns {string}
 */
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * MD5哈希（简化版，实际应使用crypto-js库）
 * @param {string} str 原字符串
 * @returns {string}
 */
function md5(str) {
  // 注意：小程序环境建议使用第三方库如 crypto-js
  // 这里仅作为示例，实际项目中请引入 crypto-js
  console.warn('请使用 crypto-js 库进行 MD5 加密');
  return str;
}

module.exports = {
  Base64,
  maskPhone,
  maskIdCard,
  maskBankCard,
  maskName,
  simpleEncrypt,
  simpleDecrypt,
  generateRandomString,
  generateOrderNo,
  md5
};
