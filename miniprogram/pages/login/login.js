// pages/login/login.js
import request from '../../utils/request';
import { wxLogin, setLoginInfo } from '../../utils/auth';
import API, { LOCAL_DEV } from '../../config/api';
import { MESSAGE } from '../../config/constants';
import { mockApi } from '../../utils/mock';

Page({
  data: {
    loading: false,
    agreed: false,
    redirectUrl: ''
  },

  onLoad(options) {
    if (options.redirect) {
      this.setData({ redirectUrl: decodeURIComponent(options.redirect) });
    }
  },

  /**
   * 获取推广人ID（从分享链接进入时存储）
   */
  getPromoterId() {
    return wx.getStorageSync('promoterId') || null;
  },

  /**
   * 切换协议勾选
   */
  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  /**
   * 检查协议，未勾选则提示用户
   * @returns {boolean} 是否已同意
   */
  checkAgreement(callback) {
    if (this.data.agreed) {
      callback && callback();
      return true;
    }
    wx.showToast({
      title: '请先阅读并同意用户协议和隐私政策',
      icon: 'none',
      duration: 2000
    });
    return false;
  },

  /**
   * 手机号登录按钮点击（开发环境 fallback）
   * 开发者工具中 getPhoneNumber 不会触发，bindtap 先执行走 devLogin
   */
  onPhoneBtnTap() {
    if (this.data.loading) return;
    // 开发环境：直接走 devLogin
    if (API.user.devLogin) {
      this.checkAgreement(() => {
        this.doDevLogin();
      });
    }
  },

  /**
   * 微信手机号授权回调（真机生效）
   */
  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '需要手机号才能登录', icon: 'none' });
      return;
    }

    this.checkAgreement(() => {
      this.doPhoneQuickLogin(e);
    });
  },

  /**
   * 执行手机号快捷登录
   */
  async doPhoneQuickLogin(e) {
    try {
      if (this.data.loading) return;
      this.setData({ loading: true });

      const loginRes = await wx.login();
      const promoterId = this.getPromoterId();
      const data = await request.post(API.user.phoneQuickLogin, {
        code: loginRes.code,
        phoneCode: e.detail.code,
        promoterId
      });

      setLoginInfo(data.token, data.userInfo);
      wx.showToast({ title: MESSAGE.loginSuccess, icon: 'success' });
      setTimeout(() => { this.handleLoginSuccess(data.userInfo); }, 1500);
    } catch (err) {
      console.log('[登录] 手机号快捷登录失败:', err.message);
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 微信一键登录
   */
  onWxLogin() {
    if (this.data.loading) return;
    this.checkAgreement(() => {
      this.doWxLogin();
    });
  },

  /**
   * 执行微信登录
   */
  async doWxLogin() {
    try {
      this.setData({ loading: true });

      // 开发环境：优先 devLogin
      if (API.user.devLogin) {
        try {
          const data = await request.post(API.user.devLogin);
          setLoginInfo(data.token, data.userInfo);
          wx.showToast({ title: MESSAGE.loginSuccess, icon: 'success' });
          setTimeout(() => { this.handleLoginSuccess(data.userInfo); }, 1500);
          return;
        } catch (devErr) {}
      }

      // 正式环境
      const code = await wxLogin();
      const promoterId = this.getPromoterId();
      const data = await request.post(API.user.wxLogin, { code, promoterId });
      setLoginInfo(data.token, data.userInfo);
      wx.showToast({ title: MESSAGE.loginSuccess, icon: 'success' });
      setTimeout(() => { this.handleLoginSuccess(data.userInfo); }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 开发环境登录
   */
  async doDevLogin() {
    try {
      this.setData({ loading: true });
      const data = await request.post(API.user.devLogin);
      setLoginInfo(data.token, data.userInfo);
      wx.showToast({ title: MESSAGE.loginSuccess, icon: 'success' });
      setTimeout(() => { this.handleLoginSuccess(data.userInfo); }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 登录成功跳转
   */
  handleLoginSuccess(userInfo) {
    if (this.data.redirectUrl) {
      wx.redirectTo({ url: this.data.redirectUrl });
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  /**
   * 查看用户协议
   */
  onViewUserProtocol() {
    wx.navigateTo({ url: '/pages/webview/webview?type=user&title=用户协议' });
  },

  /**
   * 查看隐私政策
   */
  onViewPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/webview/webview?type=privacy&title=隐私政策' });
  },

  /**
   * 游客模式
   */
  onBackToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
