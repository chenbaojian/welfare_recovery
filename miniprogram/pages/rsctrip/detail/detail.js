// pages/rsctrip/detail/detail.js
import { checkLogin, getUserInfo } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    cardProductId: null,
    cardPwd: '',
    amount: '',
    discountRate: 0,       // 从API获取的折扣率
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false,
    loading: true
  },

  onLoad(options) {
    const isLoggedIn = checkLogin();
    const cardProductId = options.cardProductId || null;

    this.setData({ isLoggedIn, cardProductId });
    wx.setNavigationBarTitle({
      title: '融晟携程卡包回收'
    });

    if (cardProductId) {
      this.loadFaceValues(cardProductId);
    } else {
      this.setData({ loading: false });
    }
  },

  /**
   * 从API加载面值列表（获取折扣率）
   */
  async loadFaceValues(cardProductId) {
    try {
      const data = await request.get(`${API.card.recycleFaceValues}/${cardProductId}/face-values`);
      const faceValueList = data || [];
      // 对于手动输入额度的卡类型，取第一个面值记录的折扣率作为默认折扣率
      if (faceValueList.length > 0) {
        this.setData({
          discountRate: faceValueList[0].discountRate,
          loading: false
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载折扣率失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载折扣率失败', icon: 'none' });
    }
  },

  /**
   * 输入卡密
   */
  onInputCardPwd(e) {
    this.setData({
      cardPwd: e.detail.value || ''
    });
  },

  /**
   * 输入金额 - 使用API返回的折扣率计算回收金额
   */
  onInputAmount(e) {
    let value = e.detail.value || '';
    // 只允许输入数字和小数点
    value = value.replace(/[^\d.]/g, '');
    // 处理多个小数点的情况
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // 计算回收金额
    const amount = parseFloat(value) || 0;
    const recycleAmount = (amount * this.data.discountRate).toFixed(2);

    this.setData({
      amount: value,
      recycleAmount: recycleAmount
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { cardPwd, amount } = this.data;

    if (!cardPwd || !cardPwd.trim()) {
      wx.showToast({ title: '请输入卡密', icon: 'none' });
      return false;
    }

    if (cardPwd.length < 6 || cardPwd.length > 30) {
      wx.showToast({ title: '卡密应为6-30位', icon: 'none' });
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请输入有效的金额', icon: 'none' });
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

    const { cardPwd, amount, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `卡密: ${cardPwd}\n金额: ${amount}元\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
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

    const { cardProductId, cardPwd, amount, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: 'rsctrip', typeName: '融晟携程卡包',
          cardPwd: cardPwd.substring(0, 4) + '****',
          amount: parseFloat(amount), recycleAmount: parseFloat(recycleAmount),
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
        cardProductId: cardProductId,
        faceValue: parseFloat(amount),
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