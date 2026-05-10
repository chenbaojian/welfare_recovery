// pages/laobao/detail/detail.js
import { checkLogin } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    platform: '',
    phone: '',
    phoneError: '',
    password: '',
    points: '',
    discount: 0.70,
    recycleAmount: 0,
    submitting: false,
    isLoggedIn: false,

    // 售卖平台选项
    platforms: [
      { id: 'jd', name: '京东' },
      { id: 'suning', name: '苏宁' },
      { id: 'vip', name: '唯品会' },
      { id: 'other', name: '其他' }
    ],
    showPlatformPicker: false
  },

  onLoad(options) {
    const isLoggedIn = checkLogin();
    this.setData({ isLoggedIn });

    wx.setNavigationBarTitle({
      title: '劳保积分回收'
    });
  },

  /**
   * 显示平台选择器
   */
  onShowPlatformPicker() {
    this.setData({ showPlatformPicker: true });
  },

  /**
   * 选择平台
   */
  onSelectPlatform(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      platform: name,
      platformId: id,
      showPlatformPicker: false
    });
  },

  /**
   * 关闭平台选择器
   */
  onClosePlatformPicker() {
    this.setData({ showPlatformPicker: false });
  },

  /**
   * 输入手机号
   */
  onInputPhone(e) {
    let value = e.detail;
    // 只允许输入数字
    value = value.replace(/\D/g, '');

    // 验证手机号
    let phoneError = '';
    if (value.length === 11) {
      if (!/^1[3-9]\d{9}$/.test(value)) {
        phoneError = '请输入正确的手机号';
      }
    }

    this.setData({
      phone: value,
      phoneError
    });
  },

  /**
   * 输入登录密码
   */
  onInputPassword(e) {
    this.setData({ password: e.detail });
  },

  /**
   * 输入积分额度
   */
  onInputPoints(e) {
    let value = e.detail;
    // 只允许输入数字和小数点
    value = value.replace(/[^\d.]/g, '');
    // 处理多个小数点的情况
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    const points = parseFloat(value) || 0;
    const recycleAmount = (points * this.data.discount).toFixed(2);

    this.setData({
      points: value,
      recycleAmount
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { platform, phone, phoneError, password, points } = this.data;

    if (!platform) {
      wx.showToast({ title: '请选择售卖平台', icon: 'none' });
      return false;
    }

    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' });
      return false;
    }

    if (phoneError) {
      wx.showToast({ title: phoneError, icon: 'none' });
      return false;
    }

    if (!password) {
      wx.showToast({ title: '请输入登录密码', icon: 'none' });
      return false;
    }

    if (!points || parseFloat(points) <= 0) {
      wx.showToast({ title: '请输入有效的积分额度', icon: 'none' });
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

    const { platform, phone, points, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `售卖平台: ${platform}\n手机号: ${phone}\n积分额度: ${points}\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
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

    const { platform, platformId, phone, password, points, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: 'laobao', typeName: '劳保积分',
          platform, platformId,
          phone: phone.substring(0, 3) + '****' + phone.substring(7),
          points: parseFloat(points), recycleAmount: parseFloat(recycleAmount),
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
        cardTypeId: 10,
        faceValue: parseFloat(points),
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
