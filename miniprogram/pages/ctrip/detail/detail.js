// pages/ctrip/detail/detail.js
import { checkLogin, getUserInfo } from '../../../utils/auth';
import request from '../../../utils/request';
import API, { LOCAL_DEV } from '../../../config/api';
const { addOrder } = require('../../../utils/userData');

Page({
  data: {
    cardProductId: null,
    phone: '',
    phoneError: '',
    password: '',
    points: '',
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
      title: '携程积分回收'
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
   * 输入手机号
   */
  onInputPhone(e) {
    const value = e.detail.value || '';
    // 只允许输入数字，最多11位
    const phone = value.replace(/\D/g, '').substring(0, 11);

    // 验证手机号
    let phoneError = '';
    if (phone.length === 11) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        phoneError = '请输入正确的手机号';
      }
    }

    this.setData({
      phone: phone,
      phoneError: phoneError
    });
  },

  /**
   * 输入登录密码
   */
  onInputPassword(e) {
    this.setData({
      password: e.detail.value || ''
    });
  },

  /**
   * 输入积分额度 - 使用API返回的折扣率计算回收金额
   */
  onInputPoints(e) {
    let value = e.detail.value || '';
    // 只允许输入数字和小数点
    value = value.replace(/[^\d.]/g, '');
    // 处理多个小数点的情况
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // 计算回收金额
    const points = parseFloat(value) || 0;
    const recycleAmount = (points * this.data.discountRate).toFixed(2);

    this.setData({
      points: value,
      recycleAmount: recycleAmount
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { phone, phoneError, password, points } = this.data;

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

    const { phone, points, recycleAmount } = this.data;

    wx.showModal({
      title: '确认提交',
      content: `手机号: ${phone}\n积分额度: ${points}\n回收金额: ${recycleAmount}元\n\n请确认信息无误后提交`,
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

    const { cardProductId, phone, password, points, recycleAmount } = this.data;

    // 本地开发模式
    if (LOCAL_DEV) {
      setTimeout(() => {
        this.setData({ submitting: false });
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId, type: 'ctrip', typeName: '携程积分',
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
        cardProductId: cardProductId,
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