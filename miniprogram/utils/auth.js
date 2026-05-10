// utils/auth.js - 授权相关工具

const { MESSAGE } = require('../config/constants');

/**
 * 检查登录状态
 * @returns {boolean}
 */
function checkLogin() {
  const token = wx.getStorageSync('token');
  const userInfo = wx.getStorageSync('userInfo');
  
  return !!(token && userInfo);
}

/**
 * 获取用户信息
 * @returns {Object|null}
 */
function getUserInfo() {
  return wx.getStorageSync('userInfo');
}

/**
 * 获取Token
 * @returns {string|null}
 */
function getToken() {
  return wx.getStorageSync('token');
}

/**
 * 设置登录信息
 * @param {string} token Token
 * @param {Object} userInfo 用户信息
 */
function setLoginInfo(token, userInfo) {
  wx.setStorageSync('token', token);
  wx.setStorageSync('userInfo', userInfo);
  
  // 更新全局状态
  const app = getApp();
  if (app) {
    app.globalData.isLoggedIn = true;
    app.globalData.userInfo = userInfo;
  }
}

/**
 * 清除登录信息
 */
function clearLoginInfo() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  
  // 更新全局状态
  const app = getApp();
  if (app) {
    app.globalData.isLoggedIn = false;
    app.globalData.userInfo = null;
  }
}

/**
 * 检查实名认证状态
 * @returns {boolean}
 */
function checkVerified() {
  const userInfo = getUserInfo();
  return !!(userInfo && userInfo.isVerified);
}

/**
 * 跳转登录页
 * @param {string} redirectUrl 登录后跳转地址
 */
function navigateToLogin(redirectUrl) {
  let url = '/pages/login/login';
  
  if (redirectUrl) {
    url += `?redirect=${encodeURIComponent(redirectUrl)}`;
  }
  
  wx.navigateTo({ url });
}

/**
 * 跳转实名认证页
 */
function navigateToVerify() {
  wx.navigateTo({
    url: '/pages/verify/verify'
  });
}

/**
 * 要求登录
 * @param {string} redirectUrl 登录后跳转地址
 * @returns {boolean}
 */
function requireLogin(redirectUrl) {
  if (!checkLogin()) {
    wx.showToast({
      title: MESSAGE.loginExpired,
      icon: 'none'
    });
    
    setTimeout(() => {
      navigateToLogin(redirectUrl);
    }, 1500);
    
    return false;
  }
  
  return true;
}

/**
 * 要求实名认证
 * @returns {boolean}
 */
function requireVerified() {
  if (!checkLogin()) {
    wx.showToast({
      title: MESSAGE.loginExpired,
      icon: 'none'
    });
    
    setTimeout(() => {
      navigateToLogin();
    }, 1500);
    
    return false;
  }
  
  if (!checkVerified()) {
    wx.showToast({
      title: MESSAGE.verifyRequired,
      icon: 'none'
    });
    
    setTimeout(() => {
      navigateToVerify();
    }, 1500);
    
    return false;
  }
  
  return true;
}

/**
 * 微信登录
 * @returns {Promise<string>} code
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('微信登录失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 获取用户信息授权
 * @returns {Promise<Object>}
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        resolve(res.userInfo);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 获取手机号授权
 * @param {Object} e 事件对象
 * @returns {Promise<Object>}
 */
function getPhoneNumber(e) {
  return new Promise((resolve, reject) => {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      resolve({
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv
      });
    } else {
      reject(new Error('手机号授权失败'));
    }
  });
}

/**
 * 检查授权状态
 * @param {string} scope 授权范围
 * @returns {Promise<boolean>}
 */
function checkAuthorize(scope) {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        resolve(res.authSetting[scope] === true);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
}

/**
 * 请求授权
 * @param {string} scope 授权范围
 * @returns {Promise<boolean>}
 */
function requestAuthorize(scope) {
  return new Promise((resolve) => {
    wx.authorize({
      scope,
      success: () => {
        resolve(true);
      },
      fail: () => {
        // 用户拒绝授权，引导打开设置页
        wx.showModal({
          title: '授权提示',
          content: '需要您授权才能使用该功能，是否前往设置？',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  resolve(settingRes.authSetting[scope] === true);
                }
              });
            } else {
              resolve(false);
            }
          }
        });
      }
    });
  });
}

module.exports = {
  checkLogin,
  getUserInfo,
  getToken,
  setLoginInfo,
  clearLoginInfo,
  checkVerified,
  navigateToLogin,
  navigateToVerify,
  requireLogin,
  requireVerified,
  wxLogin,
  getUserProfile,
  getPhoneNumber,
  checkAuthorize,
  requestAuthorize
};
