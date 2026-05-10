// src/services/user.js - 用户服务
const axios = require('axios');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/crypto');
const { getAccessToken } = require('../utils/wxToken');
const logger = require('../utils/logger');

/**
 * 获取微信session
 */
exports.getWxSession = async (code) => {
  const url = `https://api.weixin.qq.com/sns/jscode2session`;
  const params = {
    appid: process.env.WX_APPID,
    secret: process.env.WX_SECRET,
    js_code: code,
    grant_type: 'authorization_code'
  };
  
  const response = await axios.get(url, { params });
  
  if (response.data.errcode) {
    throw new Error(response.data.errmsg);
  }
  
  return response.data;
};

/**
 * 解密手机号
 */
exports.decryptPhone = async (encryptedData, iv, sessionKey) => {
  // 使用微信提供的解密方法
  // 实际应使用专门的解密库
  const decrypted = decrypt(encryptedData, sessionKey, iv);
  return JSON.parse(decrypted);
};

/**
 * 通过微信 getPhoneNumber 接口获取用户手机号
 * 微信基础库 2.21.2+ 使用 code 方式
 */
exports.getPhoneNumber = async (phoneCode) => {
  const accessToken = await getAccessToken();

  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
  const response = await axios.post(url, { code: phoneCode });

  if (response.data.errcode !== 0) {
    logger.error('微信获取手机号失败:', response.data);
    throw new Error(response.data.errmsg || '获取手机号失败');
  }

  return response.data.phone_info;
};

/**
 * 根据openid查找用户
 */
exports.findByOpenId = async (openId) => {
  return await User.findOne({ where: { openId } });
};

/**
 * 根据手机号查找用户
 */
exports.findByPhone = async (phone) => {
  return await User.findOne({ where: { phone } });
};

/**
 * 根据ID查找用户
 */
exports.findById = async (id) => {
  return await User.findByPk(id);
};

/**
 * 根据身份证号查找用户
 */
exports.findByIdCard = async (idCard) => {
  return await User.findOne({ where: { idCard } });
};

/**
 * 创建用户
 */
exports.create = async (data) => {
  return await User.create(data);
};

/**
 * 更新用户
 */
exports.update = async (id, data) => {
  return await User.update(data, { where: { id } });
};

/**
 * 实名认证
 * 开发环境：直接通过认证（无需调用第三方接口）
 * 生产环境：调用第三方实名认证接口
 */
exports.verifyRealName = async (realName, idCard) => {
  // 开发环境：直接通过认证
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[开发环境] 实名认证直接通过: ${realName}`);
    return { success: true, message: '认证成功（开发环境）' };
  }

  try {
    // 调用第三方实名认证接口
    const response = await axios.post(process.env.VERIFY_API_URL, {
      name: realName,
      idCard: idCard,
      apiKey: process.env.VERIFY_API_KEY
    });

    return {
      success: response.data.success,
      message: response.data.message
    };
  } catch (err) {
    logger.error('实名认证接口调用失败:', err);
    return { success: false };
  }
};

/**
 * 获取用户信息
 */
exports.getUserInfo = async (userId) => {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    phone: user.phone,
    realName: user.realName,
    idCard: user.idCard,
    isVerified: user.isVerified,
    verifyTime: user.verifyTime,
    balance: user.balance,
    totalRecycle: user.totalRecycle,
    orderCount: user.orderCount
  };
};