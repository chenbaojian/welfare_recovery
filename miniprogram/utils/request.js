// utils/request.js - 网络请求封装

const config = require('../config/index');
const { storageKeys } = require('../config/index');
const { ERROR_CODE, MESSAGE } = require('../config/constants');

class Request {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.requestQueue = new Map(); // 请求队列，用于取消重复请求
  }

  /**
   * 请求拦截器
   */
  interceptRequest(options) {
    const token = wx.getStorageSync(storageKeys.token);
    
    return {
      ...options,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Client': 'miniprogram',
        'X-Version': config.app.version,
        ...options.header
      }
    };
  }

  /**
   * 响应拦截器
   */
  interceptResponse(response, options) {
    const { statusCode, data } = response;
    
    // HTTP状态码处理
    switch (statusCode) {
      case 401:
        // 未登录或token过期
        this.handleUnauthorized();
        return Promise.reject(new Error(MESSAGE.loginExpired));
        
      case 403:
        // 无权限
        if (data.message === '请先完成实名认证') {
          this.handleUnverified();
        }
        return Promise.reject(new Error(data.message || ERROR_CODE[403]));
        
      case 404:
        // 资源不存在，传递后端返回的具体错误信息
        return Promise.reject(new Error(data && data.message ? data.message : ERROR_CODE[404]));
        
      case 500:
        return Promise.reject(new Error(ERROR_CODE[500]));
        
      default:
        break;
    }
    
    // 业务状态码处理
    if (!data) {
      return Promise.reject(new Error('服务器返回数据为空'));
    }

    if (data.code !== 200 && data.code !== 0) {
      const errorMsg = data.message || ERROR_CODE[data.code] || '请求失败';
      return Promise.reject(new Error(errorMsg));
    }

    return Promise.resolve(data.data);
  }

  /**
   * 处理未登录
   */
  handleUnauthorized() {
    // 清除登录信息
    wx.removeStorageSync(storageKeys.token);
    wx.removeStorageSync(storageKeys.userInfo);
    
    // 更新全局状态
    const app = getApp();
    if (app) {
      app.globalData.isLoggedIn = false;
      app.globalData.userInfo = null;
    }
    
    // 跳转登录页
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  }

  /**
   * 处理未实名认证
   */
  handleUnverified() {
    wx.navigateTo({
      url: '/pages/verify/verify'
    });
  }

  /**
   * 通用请求方法
   */
  request(options) {
    const config = this.interceptRequest(options);

    // 登录/注册类请求不做去重，避免验证码被消耗后重复请求返回旧结果
    const noDedupeUrls = ['/user/phoneSmsLogin', '/user/phonePasswordLogin', '/user/wxLogin', '/user/devLogin', '/user/register'];
    const shouldDedupe = !noDedupeUrls.some(url => config.url && config.url.includes(url));

    // 生成请求key，用于取消重复请求
    const requestKey = `${config.method || 'GET'}_${config.url}_${JSON.stringify(config.data || {})}`;

    // 如果存在相同请求，返回之前的Promise（仅对非登录请求去重）
    if (shouldDedupe && this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey);
    }
    
    const promise = new Promise((resolve, reject) => {
      wx.request({
        ...config,
        url: this.baseUrl + config.url,
        timeout: this.timeout,
        success: (res) => {
          this.interceptResponse(res, options)
            .then(resolve)
            .catch(reject);
        },
        fail: (err) => {
          // 网络错误
          reject(new Error(MESSAGE.networkError));
        },
        complete: () => {
          // 请求完成后从队列中移除
          this.requestQueue.delete(requestKey);
        }
      });
    });
    
    this.requestQueue.set(requestKey, promise);
    return promise;
  }

  /**
   * GET请求
   */
  get(url, data, options = {}) {
    return this.request({
      ...options,
      url,
      data,
      method: 'GET'
    });
  }

  /**
   * POST请求
   */
  post(url, data, options = {}) {
    return this.request({
      ...options,
      url,
      data,
      method: 'POST'
    });
  }

  /**
   * PUT请求
   */
  put(url, data, options = {}) {
    return this.request({
      ...options,
      url,
      data,
      method: 'PUT'
    });
  }

  /**
   * DELETE请求
   */
  delete(url, data, options = {}) {
    return this.request({
      ...options,
      url,
      data,
      method: 'DELETE'
    });
  }

  /**
   * 文件上传
   */
  upload(url, filePath, formData = {}, options = {}) {
    const token = wx.getStorageSync(storageKeys.token);
    
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.baseUrl + url,
        filePath,
        name: options.name || 'file',
        formData,
        header: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 200 || data.code === 0) {
              resolve(data.data);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (err) {
            reject(new Error('上传失败'));
          }
        },
        fail: () => {
          reject(new Error(MESSAGE.networkError));
        }
      });
    });
  }
}

// 创建单例
const request = new Request();

module.exports = request;
