// pages/detail/detail.js
import request from '../../utils/request';
import { requireVerified, checkLogin, getUserInfo } from '../../utils/auth';
import { validateCardNo, validateCardPwd } from '../../utils/validate';
import { formatMoney, formatDiscount } from '../../utils/util';
import API, { LOCAL_DEV } from '../../config/api';
import { CARD_ICONS, MESSAGE } from '../../config/constants';
import { mockApi, mockCardTypes } from '../../utils/mock';
const { addOrder } = require('../../utils/userData');

Page({
  data: {
    cardType: null,       // 卡券类型信息
    faceValues: [],       // 面值选项
    selectedValue: null,  // 选中的面值
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
    submitting: false,
    
    // 计算结果
    calculation: null
  },

  onLoad(options) {
    // 检查实名认证
    if (!requireVerified()) {
      return;
    }
    
    // 加载卡券详情
    if (options.id) {
      this.loadCardDetail(options.id);
    }
  },

  /**
   * 加载卡券详情
   */
  async loadCardDetail(id) {
    try {
      this.setData({ loading: true });

      // 本地开发模式：使用模拟数据
      if (LOCAL_DEV) {
        const data = mockCardTypes.find(item => item.id === id);
        if (!data) {
          throw new Error('卡券类型不存在');
        }
        const faceValues = data.faceValues || [];
        this.setData({
          cardType: data,
          faceValues,
          loading: false
        });
        return;
      }

      const data = await request.get(API.card.detail, { id });

      // 处理面值选项
      const faceValues = data.faceValues || [];

      // 添加图标
      data.icon = CARD_ICONS[data.id] || CARD_ICONS['default'];

      this.setData({
        cardType: data,
        faceValues,
        loading: false
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 选择面值
   */
  onSelectValue(e) {
    const { value } = e.currentTarget.dataset;
    
    this.setData({
      selectedValue: value
    });
    
    // 计算回收金额
    this.calculateAmount(value);
  },

  /**
   * 计算回收金额
   */
  async calculateAmount(faceValue) {
    if (!faceValue) return;

    try {
      // 本地开发模式：使用模拟数据
      if (LOCAL_DEV) {
        const data = mockApi.calculateRecycle(this.data.cardType.id, faceValue);
        if (data) {
          this.setData({
            recycleAmount: data.recycleAmount,
            calculation: data
          });
        }
        return;
      }

      const data = await request.post(API.card.calculate, {
        cardTypeId: this.data.cardType.id,
        faceValue
      });

      this.setData({
        recycleAmount: data.recycleAmount,
        calculation: data
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '计算失败',
        icon: 'none'
      });
    }
  },

  /**
   * 输入卡号
   */
  onCardNoInput(e) {
    const { value } = e.detail;
    this.setData({
      'form.cardNo': value,
      'errors.cardNo': ''
    });
  },

  /**
   * 输入卡密
   */
  onCardPwdInput(e) {
    const { value } = e.detail;
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
    const { cardType, selectedValue } = this.data;
    const errors = {};
    let valid = true;

    // 校验面值
    if (!selectedValue) {
      wx.showToast({
        title: '请选择面值',
        icon: 'none'
      });
      return false;
    }

    // 校验卡号
    if (!cardNo) {
      errors.cardNo = '请输入卡号';
      valid = false;
    } else if (!validateCardNo(cardNo, cardType.cardNoMinLength, cardType.cardNoMaxLength)) {
      errors.cardNo = `卡号长度应在${cardType.cardNoMinLength}-${cardType.cardNoMaxLength}位`;
      valid = false;
    }

    // 校验卡密
    if (!cardPwd) {
      errors.cardPwd = '请输入卡密';
      valid = false;
    } else if (!validateCardPwd(cardPwd, cardType.cardPwdMinLength, cardType.cardPwdMaxLength)) {
      errors.cardPwd = `卡密长度应在${cardType.cardPwdMinLength}-${cardType.cardPwdMaxLength}位`;
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

    // 确认提交
    wx.showModal({
      title: '确认提交',
      content: `确认提交${this.data.selectedValue}元${this.data.cardType.name}回收订单？回收金额：¥${formatMoney(this.data.recycleAmount)}`,
      success: async (res) => {
        if (res.confirm) {
          await this.submitOrder();
        }
      }
    });
  },

  /**
   * 提交订单
   */
  async submitOrder() {
    try {
      this.setData({ submitting: true });

      // 本地开发模式
      if (LOCAL_DEV) {
        const orderId = 'ORD' + Date.now();
        const order = {
          id: orderId,
          type: this.data.cardType.id,
          typeName: this.data.cardType.name,
          cardNo: this.data.form.cardNo.substring(0, 4) + '****' + this.data.form.cardNo.substring(this.data.form.cardNo.length - 4),
          faceValue: this.data.selectedValue,
          recycleAmount: this.data.recycleAmount,
          status: 'processing',
          statusText: '处理中',
          createTime: new Date().toLocaleString()
        };

        addOrder(order);

        wx.showToast({
          title: MESSAGE.orderSuccess,
          icon: 'success'
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/order/list/list'
          });
        }, 1500);
        return;
      }

      const data = await request.post(API.order.create, {
        cardTypeId: this.data.cardType.id,
        faceValue: this.data.selectedValue,
        cardNo: this.data.form.cardNo,
        cardPwd: this.data.form.cardPwd
      });

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
    return {
      title: `${this.data.cardType.name}回收 - 最高${formatDiscount(this.data.cardType.discountRate)}`,
      path: `/pages/detail/detail?id=${this.data.cardType.id}`,
      imageUrl: this.data.cardType.icon
    };
  }
});