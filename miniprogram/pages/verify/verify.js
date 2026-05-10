// pages/verify/verify.js
import request from '../../utils/request';
import { validateName, validateIdCard } from '../../utils/validate';
import { getUserInfo } from '../../utils/auth';
import API from '../../config/api';
import { MESSAGE } from '../../config/constants';

Page({
  data: {
    form: {
      realName: '',
      idCard: ''
    },
    errors: {
      realName: '',
      idCard: ''
    },
    agreed: false,
    loading: false,
    userInfo: null
  },

  onLoad() {
    // 获取用户信息
    const userInfo = getUserInfo();
    this.setData({ userInfo });
    
    // 如果已认证，显示提示
    if (userInfo && userInfo.isVerified) {
      wx.showModal({
        title: '提示',
        content: '您已完成实名认证',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 输入姓名
   */
  onNameInput(e) {
    this.setData({
      'form.realName': e.detail.value || e.detail,
      'errors.realName': ''
    });
  },

  /**
   * 输入身份证号
   */
  onIdCardInput(e) {
    const value = (e.detail.value || e.detail || '').toUpperCase();
    this.setData({
      'form.idCard': value,
      'errors.idCard': ''
    });
  },

  /**
   * 校验表单
   */
  validateForm() {
    const { realName, idCard } = this.data.form;
    const errors = {};
    let valid = true;

    // 校验姓名
    if (!realName) {
      errors.realName = '请输入真实姓名';
      valid = false;
    } else if (!validateName(realName)) {
      errors.realName = MESSAGE.nameInvalid;
      valid = false;
    }

    // 校验身份证号
    if (!idCard) {
      errors.idCard = '请输入身份证号';
      valid = false;
    } else if (!validateIdCard(idCard)) {
      errors.idCard = MESSAGE.idCardInvalid;
      valid = false;
    }

    this.setData({ errors });
    return valid;
  },

  /**
   * 提交认证
   */
  async onSubmit() {
    // 防止重复提交
    if (this.data.loading) return;

    // 校验表单
    if (!this.validateForm()) {
      wx.showToast({
        title: '请检查输入信息',
        icon: 'none'
      });
      return;
    }

    // 检查是否同意协议
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意认证协议',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ loading: true });

      const { realName, idCard } = this.data.form;

      // 调用实名认证接口
      const data = await request.post(API.user.verify, {
        realName,
        idCard
      });

      // 更新本地用户信息
      const userInfo = getUserInfo();
      if (userInfo) {
        userInfo.isVerified = true;
        userInfo.verifyTime = data.verifyTime;
        wx.setStorageSync('userInfo', userInfo);

        // 更新全局状态
        const app = getApp();
        if (app) {
          app.globalData.userInfo = userInfo;
        }
      }

      wx.showToast({
        title: MESSAGE.verifySuccess,
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.showToast({
        title: err.message || '认证失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 同意协议
   */
  onAgreeChange(e) {
    this.setData({
      agreed: e.detail
    });
  },

  /**
   * 查看认证协议
   */
  onViewProtocol() {
    wx.navigateTo({
      url: '/pages/webview/webview?type=verify&title=实名认证协议'
    });
  },

  /**
   * 跳过认证
   */
  onSkip() {
    wx.showModal({
      title: '提示',
      content: '跳过实名认证将无法使用回收服务，确定跳过吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  }
});