// src/utils/wxToken.js - 微信 access_token 缓存管理
const axios = require('axios');
const logger = require('./logger');

// 内存缓存
let tokenCache = {
  token: '',
  expireTime: 0
};

/**
 * 获取微信 access_token（带缓存，提前10分钟刷新）
 */
exports.getAccessToken = async () => {
  // 未过期直接返回
  if (tokenCache.token && Date.now() < tokenCache.expireTime) {
    return tokenCache.token;
  }

  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;

  if (!appid || !secret) {
    throw new Error('未配置 WX_APPID 或 WX_SECRET');
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const res = await axios.get(url);

    if (res.data.errcode) {
      logger.error('获取access_token失败:', res.data.errmsg);
      throw new Error('获取access_token失败: ' + res.data.errmsg);
    }

    tokenCache = {
      token: res.data.access_token,
      // 提前10分钟过期，避免边界问题
      expireTime: Date.now() + (res.data.expires_in - 600) * 1000
    };

    logger.info('access_token 刷新成功，有效期:', res.data.expires_in, '秒');
    return tokenCache.token;
  } catch (err) {
    logger.error('获取access_token异常:', err.message);
    throw err;
  }
};

/**
 * 强制刷新 access_token（用于 token 失效时）
 */
exports.refreshAccessToken = async () => {
  tokenCache = { token: '', expireTime: 0 };
  return await exports.getAccessToken();
};
