// utils/validate.js - 表单验证工具

const { REGEX } = require('../config/constants');

/**
 * 验证手机号
 * @param {string} phone 手机号
 * @returns {boolean}
 */
function validatePhone(phone) {
  if (!phone) return false;
  return REGEX.phone.test(phone);
}

/**
 * 验证身份证号
 * @param {string} idCard 身份证号
 * @returns {boolean}
 */
function validateIdCard(idCard) {
  if (!idCard) return false;
  
  // 基本格式验证
  if (!REGEX.idCard.test(idCard)) {
    return false;
  }
  
  // 校验码验证
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }
  
  const checkCode = checkCodes[sum % 11];
  return idCard[17].toUpperCase() === checkCode;
}

/**
 * 验证姓名
 * @param {string} name 姓名
 * @returns {boolean}
 */
function validateName(name) {
  if (!name) return false;
  return REGEX.name.test(name);
}

/**
 * 验证银行卡号
 * @param {string} cardNo 银行卡号
 * @returns {boolean}
 */
function validateBankCard(cardNo) {
  if (!cardNo) return false;
  
  // 基本格式验证
  if (!REGEX.bankCard.test(cardNo)) {
    return false;
  }
  
  // Luhn算法验证
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNo.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNo[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * 验证金额
 * @param {string|number} amount 金额
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {boolean}
 */
function validateAmount(amount, min = 0, max = Infinity) {
  if (amount === '' || amount === null || amount === undefined) {
    return false;
  }
  
  const num = Number(amount);
  
  if (isNaN(num)) {
    return false;
  }
  
  if (!REGEX.number.test(String(amount))) {
    return false;
  }
  
  return num >= min && num <= max;
}

/**
 * 验证卡号
 * @param {string} cardNo 卡号
 * @param {number} minLength 最小长度
 * @param {number} maxLength 最大长度
 * @returns {boolean}
 */
function validateCardNo(cardNo, minLength = 10, maxLength = 30) {
  if (!cardNo) return false;
  const length = cardNo.length;
  return length >= minLength && length <= maxLength;
}

/**
 * 验证卡密
 * @param {string} cardPwd 卡密
 * @param {number} minLength 最小长度
 * @param {number} maxLength 最大长度
 * @returns {boolean}
 */
function validateCardPwd(cardPwd, minLength = 6, maxLength = 30) {
  if (!cardPwd) return false;
  const length = cardPwd.length;
  return length >= minLength && length <= maxLength;
}

/**
 * 验证非空
 * @param {any} value 值
 * @returns {boolean}
 */
function validateRequired(value) {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return true;
}

/**
 * 验证长度范围
 * @param {string} value 值
 * @param {number} min 最小长度
 * @param {number} max 最大长度
 * @returns {boolean}
 */
function validateLength(value, min, max) {
  if (!value) return false;
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * 表单验证器
 * @param {Object} data 表单数据
 * @param {Object} rules 验证规则
 * @returns {Object} { valid: boolean, errors: Object }
 */
function validate(data, rules) {
  const errors = {};
  let valid = true;
  
  for (const field in rules) {
    const rule = rules[field];
    const value = data[field];
    
    // 必填验证
    if (rule.required && !validateRequired(value)) {
      errors[field] = rule.message || `${field}不能为空`;
      valid = false;
      continue;
    }
    
    // 如果值为空且非必填，跳过其他验证
    if (!validateRequired(value) && !rule.required) {
      continue;
    }
    
    // 自定义验证函数
    if (rule.validator && typeof rule.validator === 'function') {
      const result = rule.validator(value, data);
      if (!result) {
        errors[field] = rule.message || `${field}格式错误`;
        valid = false;
        continue;
      }
    }
    
    // 类型验证
    if (rule.type) {
      let typeValid = true;
      
      switch (rule.type) {
        case 'phone':
          typeValid = validatePhone(value);
          break;
        case 'idCard':
          typeValid = validateIdCard(value);
          break;
        case 'name':
          typeValid = validateName(value);
          break;
        case 'bankCard':
          typeValid = validateBankCard(value);
          break;
        case 'amount':
          typeValid = validateAmount(value, rule.min, rule.max);
          break;
        case 'cardNo':
          typeValid = validateCardNo(value, rule.minLength, rule.maxLength);
          break;
        case 'cardPwd':
          typeValid = validateCardPwd(value, rule.minLength, rule.maxLength);
          break;
        case 'email':
          typeValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
          break;
        case 'number':
          typeValid = !isNaN(Number(value));
          break;
        default:
          break;
      }
      
      if (!typeValid) {
        errors[field] = rule.message || `${field}格式错误`;
        valid = false;
      }
    }
    
    // 长度验证
    if (rule.minLength !== undefined || rule.maxLength !== undefined) {
      const min = rule.minLength || 0;
      const max = rule.maxLength || Infinity;
      
      if (!validateLength(value, min, max)) {
        errors[field] = rule.message || `长度应在${min}-${max}之间`;
        valid = false;
      }
    }
  }
  
  return { valid, errors };
}

module.exports = {
  validatePhone,
  validateIdCard,
  validateName,
  validateBankCard,
  validateAmount,
  validateCardNo,
  validateCardPwd,
  validateRequired,
  validateLength,
  validate
};
