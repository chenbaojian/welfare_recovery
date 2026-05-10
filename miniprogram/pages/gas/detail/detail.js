// pages/gas/detail/detail.js
import { checkLogin } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

// 运营商配置
const PROVIDER_CONFIG = {
  sinopec: {
    name: '中国石化',
    color: '#E60012',
    cardNoLength: 16,
    cardPwdLength: 20,
    faceValues: [50, 100, 200, 500, 1000]
  },
  petrochina: {
    name: '中国石油',
    color: '#F5A623',
    cardNoLength: 16,
    cardPwdLength: 20,
    faceValues: [50, 100, 200, 500, 1000]
  },
  cnooc: {
    name: '中国海油',
    color: '#00A0E9',
    cardNoLength: 16,
    cardPwdLength: 20,
    faceValues: [50, 100, 200, 500, 1000]
  }
};

Page({
  data: {
    providerId: '',
    providerName: '',
    providerColor: '#E60012',
    discount: 0.95,
    faceValues: [50, 100, 200, 500, 1000],
    selectedFaceValue: null,
    cardNo: '',
    cardPwd: '',
    cardNoLength: 16,
    cardPwdLength: 20,
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false
  },

  onLoad(options) {
    const { providerId, name, discount } = options;
    const config = PROVIDER_CONFIG[providerId] || PROVIDER_CONFIG.sinopec;

    const isLoggedIn = checkLogin();

    this.setData({
      providerId,
      providerName: decodeURIComponent(name || config.name),
      providerColor: config.color,
      discount: parseFloat(discount) || 0.95,
      faceValues: config.faceValues,
      cardNoLength: config.cardNoLength,
      cardPwdLength: config.cardPwdLength,
      isLoggedIn
    });

    wx.setNavigationBarTitle({
      title: this.data.providerName + '加油卡'
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
    const value = e.detail.replace(/\D/g, '');
    this.setData({ cardNo: value });
  },

  /**
   * 输入卡密
   */
  onInputCardPwd(e) {
    const value = e.detail.replace(/\D/g, '');
    this.setData({ cardPwd: value });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { selectedFaceValue, cardNo, cardPwd, cardNoLength, cardPwdLength } = this.data;

    if (!selectedFaceValue) {
      wx.showToast({ title: '请选择面值', icon: 'none' });
      return false;
    }

    if (cardNo.length !== cardNoLength) {
      wx.showToast({ title: `卡号应为${cardNoLength}位`, icon: 'none' });
      return false;
    }

    if (cardPwd.length !== cardPwdLength) {
      wx.showToast({ title: `卡密应为${cardPwdLength}位`, icon: 'none' });
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

    if (!this.validateForm()) {
      return;
    }

    const { providerId, providerName, selectedFaceValue, cardNo, cardPwd, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `面值: ${selectedFaceValue}元\n回收金额: ${recycleAmount}元\n\n请确认卡号卡密无误后提交`,
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

    const { providerId, providerName, selectedFaceValue, cardNo, cardPwd, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: 'gas', providerId, providerName,
          faceValue: selectedFaceValue, recycleAmount: parseFloat(recycleAmount),
          cardNo: cardNo.substring(0, 4) + '****' + cardNo.substring(cardNo.length - 4),
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
        cardTypeId: 2,
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
