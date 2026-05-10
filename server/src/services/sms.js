// src/services/sms.js - 短信验证码服务
const logger = require('../utils/logger');

// 验证码存储（生产环境应使用Redis）
const codeStore = new Map();

/**
 * 生成6位随机验证码
 */
function generateCode() {
  return Math.random().toString().slice(-6);
}

/**
 * 发送验证码
 */
exports.sendCode = async (phone, type = 'login') => {
  const code = generateCode();
  const key = `${phone}:${type}`;

  // 存储验证码，有效期5分钟
  codeStore.set(key, {
    code,
    expireTime: Date.now() + 5 * 60 * 1000,
    attempts: 0
  });

  // 生产环境：调用短信服务商API发送验证码
  // 开发环境：直接返回验证码供调试
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[开发模式] 验证码: ${code}, 手机号: ${phone}, 类型: ${type}`);
    return { code }; // 开发环境直接返回验证码
  }

  // 生产环境调用短信API（如阿里云短信、腾讯云短信等）
  try {
    // TODO: 替换为实际短信服务商API
    // const result = await smsClient.send({
    //   phone,
    //   signName: process.env.SMS_SIGN_NAME,
    //   templateCode: process.env.SMS_TEMPLATE_CODE,
    //   templateParam: { code }
    // });
    logger.info(`验证码已发送至 ${phone}`);
    return { message: '验证码已发送' };
  } catch (err) {
    logger.error('短信发送失败:', err);
    throw new Error('验证码发送失败，请稍后重试');
  }
};

/**
 * 验证验证码
 */
exports.verifyCode = async (phone, code, type = 'login') => {
  const key = `${phone}:${type}`;
  const stored = codeStore.get(key);

  if (!stored) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > stored.expireTime) {
    codeStore.delete(key);
    return false;
  }

  // 检查尝试次数（最多5次）
  if (stored.attempts >= 5) {
    codeStore.delete(key);
    return false;
  }

  // 验证码比对
  stored.attempts++;

  if (stored.code === code) {
    // 验证成功，删除验证码
    codeStore.delete(key);
    return true;
  }

  return false;
};