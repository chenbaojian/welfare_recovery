// pages/music/detail/detail.js
import { checkLogin, getUserInfo } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    type: '',
    typeName: '',
    cardNo: '',
    cardPwd: '',
    amount: '',
    discount: 0.80,
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false
  },

  onLoad(options) {
    const isLoggedIn = checkLogin();
    const type = options.type || '';
    const typeName = decodeURIComponent(options.name || '影音券');

    this.setData({ type, typeName, isLoggedIn });
    
    wx.setNavigationBarTitle({
      title: typeName + '回收'
    });
  },

  /**
   * 输入卡号
   */
  onInputCardNo(e) {
    const value = e.detail.value || '';
    this.setData({ cardNo: value });
  },

  /**
   * 输入卡密
   */
  onInputCardPwd(e) {
    const value = e.detail.value || '';
    this.setData({ cardPwd: value });
  },

  /**
   * 输入额度
   */
  onInputAmount(e) {
    let value = e.detail.value || '';
    // 只允许输入数字和小数点
    value = value.replace(/[^\d.]/g, '');
    // 只保留第一个小数点
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1) {
      value = value.substring(0, dotIndex + 1) + value.substring(dotIndex + 1).replace(/\./g, '');
    }
    // 最多两位小数
    if (dotIndex !== -1) {
      const decimalPart = value.substring(dotIndex + 1);
      if (decimalPart.length > 2) {
        value = value.substring(0, dotIndex + 3);
      }
    }

    const recycleAmount = value ? (parseFloat(value) * this.data.discount).toFixed(2) : 0;
    this.setData({ amount: value, recycleAmount });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { cardNo, cardPwd, amount } = this.data;

    if (!cardNo.trim()) {
      wx.showToast({ title: '请输入卡号', icon: 'none' });
      return false;
    }

    if (cardNo.length < 10 || cardNo.length > 30) {
      wx.showToast({ title: '卡号应为10-30位', icon: 'none' });
      return false;
    }

    if (!cardPwd.trim()) {
      wx.showToast({ title: '请输入卡密', icon: 'none' });
      return false;
    }

    if (cardPwd.length < 6 || cardPwd.length > 30) {
      wx.showToast({ title: '卡密应为6-30位', icon: 'none' });
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效额度', icon: 'none' });
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

    const { typeName, cardNo, cardPwd, amount, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `类型: ${typeName}\n卡号: ${cardNo}\n额度: ${amount}元\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
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

    const { type, typeName, cardNo, cardPwd, amount, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: type || 'music', typeName: typeName,
          cardNo: cardNo.substring(0, 4) + '****' + cardNo.substring(cardNo.length - 4),
          faceValue: parseFloat(amount), recycleAmount: parseFloat(recycleAmount),
          status: 'processing', statusText: '处理中', createTime: new Date().toLocaleString()
        };
        addOrder(order);
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => { wx.switchTab({ url: '/pages/order/list/list' }); }, 1500);
      }, 1000);
      return;
    }

    try {
      const data = await request.post(API.order.create, {
        cardTypeId: 12,
        faceValue: parseFloat(amount),
        cardNo: cardNo,
        cardPwd: cardPwd
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