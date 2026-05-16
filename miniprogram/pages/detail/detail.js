// pages/detail/detail.js
const request = require('../../utils/request');
const { requireVerified, checkLogin, getUserInfo } = require('../../utils/auth');
const { validateCardNo, validateCardPwd } = require('../../utils/validate');
const { formatMoney, formatDiscount } = require('../../utils/util');
const API = require('../../config/api');
const { CARD_ICONS, MESSAGE } = require('../../config/constants');
const { addOrder } = require('../../utils/userData');

Page({
  data: {
    // 页面参数
    cardProductId: null,  // 卡产品ID
    cardTypeId: null,     // 卡券类型ID
    cardProductName: '',  // 卡产品名称

    // 卡券信息
    cardType: null,       // 卡券类型信息（用于展示头部）
    faceValues: [],       // 面值选项列表（含折扣率）
    selectedFaceValue: null,  // 选中的面值对象
    recycleAmount: 0,     // 回收金额

    form: {
      cardNo: '',
      cardPwd: ''
    },
    errors: {
      cardNo: '',
      cardPwd: ''
    },

    loading: false,
    submitting: false
  },

  onLoad(options) {
    // 检查实名认证
    if (!requireVerified()) {
      return;
    }

    const { cardProductId, cardTypeId, cardProductName } = options;

    if (!cardProductId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      cardProductId,
      cardTypeId: cardTypeId || '',
      cardProductName: cardProductName ? decodeURIComponent(cardProductName) : ''
    });

    // 动态设置导航栏标题
    if (this.data.cardProductName) {
      wx.setNavigationBarTitle({
        title: this.data.cardProductName
      });
    }

    this.loadFaceValues();
  },

  /**
   * 加载卡产品面值列表
   * 调用 GET /api/card/card-product/:id/face-values
   */
  async loadFaceValues() {
    try {
      this.setData({ loading: true });

      const url = `${API.card.recycleFaceValues}/${this.data.cardProductId}/face-values`;
      const data = await request.get(url);

      if (!data) {
        throw new Error('获取面值信息失败');
      }

      // data 结构（来自 GET /api/card/card-product/:id/face-values）：
      // {
      //   isHot: 0/1,
      //   faceValues: [
      //     { faceValue, discountRate, recycleAmount, isSaleable },
      //     ...
      //   ]
      // }

      const faceValues = (data.faceValues || []).map((item, index) => ({
        ...item,
        id: item.id || index,  // 确保有唯一标识
        // 格式化折扣显示（如 0.95 → 9.5折）
        discountText: this.formatDiscountText(item.discountRate),
        // 面值显示文本
        faceValueText: item.faceValue + '元'
      }));

      // 设置页面标题
      const displayName = this.data.cardProductName || '卡券回收';
      wx.setNavigationBarTitle({ title: displayName });

      this.setData({
        cardType: {
          icon: CARD_ICONS['default'],
          name: displayName
        },
        faceValues,
        loading: false
      });
    } catch (err) {
      console.error('加载面值列表失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /**
   * 格式化折扣文本
   * 0.95 → "9.5折", 0.98 → "9.8折"
   */
  formatDiscountText(rate) {
    if (!rate && rate !== 0) return '';
    const discount = (rate * 10).toFixed(1);
    // 去掉末尾的 .0
    return discount.endsWith('.0') ? discount.slice(0, -2) + '折' : discount + '折';
  },

  /**
   * 选择面值
   */
  onSelectValue(e) {
    const { index } = e.currentTarget.dataset;
    const faceValue = this.data.faceValues[index];

    if (!faceValue) return;

    this.setData({
      selectedFaceValue: faceValue
    });

    // 计算回收金额
    this.calculateAmount(faceValue);
  },

  /**
   * 计算回收金额
   * 面值 × 收卡折扣率
   */
  calculateAmount(faceValue) {
    if (!faceValue) return;

    const recycleAmount = (faceValue.faceValue * faceValue.discountRate).toFixed(2);

    this.setData({
      recycleAmount
    });
  },

  /**
   * 输入卡号
   */
  onCardNoInput(e) {
    // Vant van-field 的 bind:input 事件，e.detail 直接是字符串值
    const value = typeof e.detail === 'string' ? e.detail : (e.detail.value || '');
    this.setData({
      'form.cardNo': value,
      'errors.cardNo': ''
    });
  },

  /**
   * 输入卡密
   */
  onCardPwdInput(e) {
    const value = typeof e.detail === 'string' ? e.detail : (e.detail.value || '');
    this.setData({
      'form.cardPwd': value,
      'errors.cardPwd': ''
    });
  },

  /**
   * 校验表单
   */
  validateForm() {
    const { cardNo, cardPwd } = this.data.form;
    const { selectedFaceValue } = this.data;
    const errors = {};
    let valid = true;

    // 校验面值
    if (!selectedFaceValue) {
      wx.showToast({ title: '请选择面值', icon: 'none' });
      return false;
    }

    // 校验卡号
    if (!cardNo) {
      errors.cardNo = '请输入卡号';
      valid = false;
    } else if (cardNo.length < 8) {
      errors.cardNo = '卡号长度不能少于8位';
      valid = false;
    }

    // 校验卡密
    if (!cardPwd) {
      errors.cardPwd = '请输入卡密';
      valid = false;
    } else if (cardPwd.length < 6) {
      errors.cardPwd = '卡密长度不能少于6位';
      valid = false;
    }

    this.setData({ errors });
    return valid;
  },

  /**
   * 提交订单
   */
  async onSubmit() {
    // 检查登录状态
    if (!checkLogin()) {
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

    // 检查实名认证
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

    // 校验表单
    if (!this.validateForm()) {
      return;
    }

    const { selectedFaceValue, cardProductName, recycleAmount } = this.data;

    // 确认提交
    wx.showModal({
      title: '确认提交',
      content: `确认提交${selectedFaceValue.faceValue}元${cardProductName}回收订单？回收金额：¥${recycleAmount}`,
      success: async (res) => {
        if (res.confirm) {
          await this.submitOrder();
        }
      }
    });
  },

  /**
   * 提交订单到后端
   */
  async submitOrder() {
    try {
      this.setData({ submitting: true });

      const { selectedFaceValue, cardProductId, cardTypeId, form } = this.data;

      const orderData = {
        cardTypeId: cardTypeId || undefined,
        cardProductId: cardProductId,
        faceValue: selectedFaceValue.faceValue,
        cardNo: form.cardNo,
        cardPwd: form.cardPwd
      };

      const data = await request.post(API.order.create, orderData);

      wx.showToast({
        title: MESSAGE.orderSuccess,
        icon: 'success'
      });

      // 跳转订单列表
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/order/list/list'
        });
      }, 1500);
    } catch (err) {
      wx.showToast({
        title: err.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 查看说明
   */
  onViewNotice() {
    wx.showModal({
      title: '回收说明',
      content: this.data.cardType.notice || '请确保卡券有效且未使用，提交后无法撤销。',
      showCancel: false
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const { cardProductName, selectedFaceValue } = this.data;
    const discountText = selectedFaceValue ? selectedFaceValue.discountText : '';
    return {
      title: `${cardProductName}回收${discountText ? ' - ' + discountText : ''}`,
      path: `/pages/detail/detail?cardProductId=${this.data.cardProductId}&cardTypeId=${this.data.cardTypeId}`
    };
  }
});
