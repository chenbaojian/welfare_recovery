// pages/ecommerce/detail/detail.js
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    type: '',
    typeName: '',
    faceValues: [100, 200, 300, 500, 1000, 2000],
    selectedFaceValue: null,
    cardNo: '',
    cardPwd: '',
    discount: 0.97,
    recycleAmount: 0,
    submitting: false
  },

  onLoad(options) {
    const type = options.type || '';
    const typeName = decodeURIComponent(options.name || '电商卡');
    
    this.setData({ type, typeName });
    
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
   * 验证表单
   */
  validateForm() {
    const { cardNo, cardPwd, selectedFaceValue } = this.data;

    if (!cardNo.trim()) {
      wx.showToast({ title: '请输入卡号', icon: 'none' });
      return false;
    }

    if (!cardPwd.trim()) {
      wx.showToast({ title: '请输入卡密', icon: 'none' });
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
    if (!this.validateForm()) {
      return;
    }

    const { typeName, cardNo, selectedFaceValue, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `类型: ${typeName}\n卡号: ${cardNo}\n面值: ${selectedFaceValue}元\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
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

    const { type, typeName, cardNo, cardPwd, selectedFaceValue, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: type || 'ecommerce', typeName: typeName,
          cardNo: cardNo.substring(0, 4) + '****' + cardNo.substring(cardNo.length - 4),
          faceValue: selectedFaceValue, recycleAmount: parseFloat(recycleAmount),
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
        cardTypeId: 13,
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