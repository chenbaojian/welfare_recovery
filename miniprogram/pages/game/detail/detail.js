// pages/game/detail/detail.js
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    faceValues: [10, 20, 30, 50, 100, 300, 500, 1000],
    selectedFaceValue: null,
    cardNo: '',
    cardPwd: '',
    cardNoLength: 13,
    cardPwdLength: 9,
    discount: 0.90,
    recycleAmount: 0,
    submitting: false
  },

  onLoad(options) {
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
    // 只允许输入数字，最多13位
    value = value.replace(/\D/g, '').substring(0, 13);
    this.setData({ cardNo: value });
  },

  /**
   * 输入卡密
   */
  onInputCardPwd(e) {
    let value = e.detail.value || '';
    // 只允许输入数字，最多9位
    value = value.replace(/\D/g, '').substring(0, 9);
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