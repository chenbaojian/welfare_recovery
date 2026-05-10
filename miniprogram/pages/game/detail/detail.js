// pages/game/detail/detail.js
import { checkLogin, getUserInfo } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    faceValues: [10, 20, 30, 50, 100, 300, 500, 1000],
    selectedFaceValue: null,
    cardNo: '',
    cardPwd: '',
    cardNoMinLength: 10,
    cardNoMaxLength: 30,
    cardPwdMinLength: 6,
    cardPwdMaxLength: 30,
    discount: 0.90,
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false
  },

  onLoad(options) {
    const isLoggedIn = checkLogin();
    this.setData({ isLoggedIn });
    wx.setNavigationBarTitle({
      title: '网易一卡通回收'
    });
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
   * 输入卡号
   */
  onInputCardNo(e) {
    let value = e.detail.value || '';
    // 只允许输入数字
    value = value.replace(/\D/g, '').substring(0, this.data.cardNoMaxLength);
    this.setData({ cardNo: value });
  },

  /**
   * 输入卡密
   */
  onInputCardPwd(e) {
    let value = e.detail.value || '';
    // 只允许输入数字
    value = value.replace(/\D/g, '').substring(0, this.data.cardPwdMaxLength);
    this.setData({ cardPwd: value });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { selectedFaceValue, cardNo, cardPwd, cardNoMinLength, cardNoMaxLength, cardPwdMinLength, cardPwdMaxLength } = this.data;

    if (!selectedFaceValue) {
      wx.showToast({ title: '请选择面值', icon: 'none' });
      return false;
    }

    if (!cardNo || !cardNo.trim()) {
      wx.showToast({ title: '请输入卡号', icon: 'none' });
      return false;
    }

    if (cardNo.length < cardNoMinLength || cardNo.length > cardNoMaxLength) {
      wx.showToast({ title: `卡号应为${cardNoMinLength}-${cardNoMaxLength}位`, icon: 'none' });
      return false;
    }

    if (!cardPwd || !cardPwd.trim()) {
      wx.showToast({ title: '请输入卡密', icon: 'none' });
      return false;
    }

    if (cardPwd.length < cardPwdMinLength || cardPwd.length > cardPwdMaxLength) {
      wx.showToast({ title: `卡密应为${cardPwdMinLength}-${cardPwdMaxLength}位`, icon: 'none' });
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

    const { selectedFaceValue, cardNo, cardPwd, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `面值: ${selectedFaceValue}元\n卡号: ${cardNo}\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
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

    const { selectedFaceValue, cardNo, cardPwd, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: 'netease', typeName: '网易一卡通',
          faceValue: selectedFaceValue,
          cardNo: cardNo.substring(0, 4) + '****' + cardNo.substring(cardNo.length - 4),
          recycleAmount: parseFloat(recycleAmount),
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
        cardTypeId: 3,
        faceValue: selectedFaceValue,
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