// pages/ecommerce/detail/detail.js
import { checkLogin, getUserInfo } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    type: '',
    typeName: '',
    cardProductId: null,
    isHot: 0,            // 卡产品级别是否热门
    faceValueList: [],   // API返回的面值列表 [{faceValue, discountRate, recycleAmount, isSaleable}]
    faceValues: [],      // 面值金额数组 供模板渲染
    selectedFaceValue: null,
    selectedDiscountRate: 0,
    cardNo: '',
    cardPwd: '',
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false,
    loading: true
  },

  onLoad(options) {
    const isLoggedIn = checkLogin();
    const type = options.type || '';
    const typeName = decodeURIComponent(options.name || '电商卡');
    const cardProductId = options.cardProductId || null;

    this.setData({ type, typeName, isLoggedIn, cardProductId });

    wx.setNavigationBarTitle({
      title: typeName + '回收'
    });

    if (cardProductId) {
      this.loadFaceValues(cardProductId);
    } else {
      this.setData({ loading: false });
    }
  },

  /**
   * 从API加载面值列表
   */
  async loadFaceValues(cardProductId) {
    try {
      const data = await request.get(`${API.card.recycleFaceValues}/${cardProductId}/face-values`);
      // 新格式：{ isHot: 1, faceValues: [...] }
      // 兼容旧格式：直接返回数组
      let faceValueList = [];
      let isHot = 0;
      if (data && typeof data === 'object' && data.faceValues) {
        isHot = data.isHot || 0;
        faceValueList = data.faceValues || [];
      } else if (Array.isArray(data)) {
        faceValueList = data;
      }
      const faceValues = faceValueList.map(fv => fv.faceValue);
      this.setData({ faceValueList, faceValues, loading: false, isHot });
    } catch (err) {
      console.error('加载面值失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载面值失败', icon: 'none' });
    }
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
   * 选择面值 - 使用API返回的折扣率
   */
  onSelectFaceValue(e) {
    const { value } = e.currentTarget.dataset;
    const fv = this.data.faceValueList.find(f => f.faceValue === value);
    if (fv) {
      this.setData({
        selectedFaceValue: value,
        selectedDiscountRate: fv.discountRate,
        recycleAmount: fv.recycleAmount
      });
    }
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

    const { type, typeName, cardProductId, cardNo, cardPwd, selectedFaceValue, recycleAmount } = this.data;

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
      // 从面值列表中获取cardTypeId
      const fv = this.data.faceValueList.find(f => f.faceValue === selectedFaceValue);
      const cardTypeId = fv ? fv.cardTypeId : undefined;

      const data = await request.post(API.order.create, {
        cardProductId: cardProductId,
        cardTypeId: cardTypeId,
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