// pages/rsctrip/detail/detail.js
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    cardPwd: '',
    amount: '',
    discount: 0.72,
    recycleAmount: 0,
    submitting: false
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '融晟携程卡包回收'
    });
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
   * 输入金额
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
    const recycleAmount = (amount * this.data.discount).toFixed(2);

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

    if (!cardPwd) {
      wx.showToast({ title: '请输入卡密', icon: 'none' });
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

    const { cardPwd, amount, recycleAmount } = this.data;

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
        cardTypeId: 8,
        faceValue: parseFloat(amount),
        cardNo: 'rsctrip',
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