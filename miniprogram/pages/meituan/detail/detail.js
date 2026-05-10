// pages/meituan/detail/detail.js
import { checkLogin, getUserInfo } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    phone: '',
    password: '',
    faceValues: [100, 200, 500, 800, 1000, 2000, 3000, 4000, 5000],
    selectedFaceValue: null,
    discount: 0.75,
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false
  },

  onLoad(options) {
    const isLoggedIn = checkLogin();
    this.setData({ isLoggedIn });
    wx.setNavigationBarTitle({
      title: '美团企业积分回收'
    });
  },

  /**
   * 输入手机号
   */
  onInputPhone(e) {
    let value = e.detail.value || '';
    // 只允许输入数字，最多11位
    value = value.replace(/\D/g, '').substring(0, 11);
    this.setData({ phone: value });
  },

  /**
   * 输入密码
   */
  onInputPassword(e) {
    const value = e.detail.value || '';
    this.setData({ password: value });
  },

  /**
   * 选择面值
   */
  onSelectFaceValue(e) {
    const { value } = e.currentTarget.dataset;
    const recycleAmount = (value * this.data.discount).toFixed(2);

    this.setData({
      selectedFaceValue: value,
      recycleAmount
    });
  },

  /**
   * 验证手机号
   */
  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { phone, password, selectedFaceValue } = this.data;

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return false;
    }

    if (!this.validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }

    if (!password.trim()) {
      wx.showToast({ title: '请输入登录密码', icon: 'none' });
      return false;
    }

    if (!selectedFaceValue) {
      wx.showToast({ title: '请选择面值', icon: 'none' });
      return false;
    }

    return true;
  },

  /**
   * 提交订单
   */
  onSubmitOrder() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再进行操作',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }

    const userInfo = getUserInfo();
    if (userInfo && !userInfo.isVerified) {
      wx.showModal({
        title: '提示',
        content: '请先完成实名认证后再进行操作',
        confirmText: '去认证',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/verify/verify' });
          }
        }
      });
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    const { phone, selectedFaceValue, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `手机号: ${phone}\n面值: ${selectedFaceValue}元\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
      confirmText: '确认提交',
      success: (res) => {
        if (res.confirm) {
          this.doSubmitOrder();
        }
      }
    });
  },

  /**
   * 执行提交订单
   */
  async doSubmitOrder() {
    this.setData({ submitting: true });

    const { phone, password, selectedFaceValue, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: 'meituan', typeName: '美团企业积分',
          phone: phone.substring(0, 3) + '****' + phone.substring(7),
          faceValue: selectedFaceValue, recycleAmount: parseFloat(recycleAmount),
          status: 'processing', statusText: '处理中', createTime: new Date().toLocaleString()
        };
        addOrder(order);
        this.setData({ submitting: false });
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => { wx.switchTab({ url: '/pages/order/list/list' }); }, 1500);
      }, 1000);
      return;
    }

    try {
      const data = await request.post(API.order.create, {
        cardTypeId: 9,
        faceValue: selectedFaceValue,
        cardNo: phone,
        cardPwd: password
      });
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => { wx.switchTab({ url: '/pages/order/list/list' }); }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});