// pages/withdraw/withdraw.js
import request from '../../utils/request';
import { validateAmount } from '../../utils/validate';
import { formatMoney } from '../../utils/util';
import API from '../../config/api';
import { MESSAGE } from '../../config/constants';

Page({
  data: {
    balance: '0.00',
    withdrawAmount: '',
    minAmount: 10,      // 最低提现金额
    maxAmount: 5000,    // 最高提现金额
    
    defaultBank: null,  // 默认结算账户
    banks: [],          // 结算账户列表
    
    loading: false,
    submitting: false,
    
    errors: {
      amount: ''
    }
  },

  onLoad() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.setData({ loading: true });
      
      // 获取用户余额
      const userInfo = await request.get(API.user.getInfo);
      
      // 获取结算账户列表
      const bankData = await request.get(API.bank.list);
      
      // 找到默认账户
      const defaultBank = bankData.find(item => item.isDefault) || bankData[0];
      
      this.setData({
        balance: formatMoney(userInfo.balance),
        banks: bankData,
        defaultBank,
        loading: false
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 输入提现金额
   */
  onAmountInput(e) {
    const { value } = e.detail;
    
    // 只允许输入数字和小数点
    const filteredValue = value.replace(/[^\d.]/g, '');
    
    // 限制小数位数
    const parts = filteredValue.split('.');
    if (parts.length > 2) {
      return;
    }
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    this.setData({
      withdrawAmount: filteredValue,
      'errors.amount': ''
    });
  },

  /**
   * 全部提现
   */
  onWithdrawAll() {
    const balance = parseFloat(this.data.balance);
    const maxWithdraw = Math.min(balance, this.data.maxAmount);
    
    this.setData({
      withdrawAmount: formatMoney(maxWithdraw)
    });
  },

  /**
   * 校验表单
   */
  validateForm() {
    const { withdrawAmount, balance, minAmount, maxAmount } = this.data;
    const errors = {};
    let valid = true;

    // 校验金额
    if (!withdrawAmount) {
      errors.amount = '请输入提现金额';
      valid = false;
    } else if (!validateAmount(withdrawAmount, minAmount, maxAmount)) {
      errors.amount = `提现金额应在${minAmount}-${maxAmount}元之间`;
      valid = false;
    } else if (parseFloat(withdrawAmount) > parseFloat(balance)) {
      errors.amount = '提现金额不能超过账户余额';
      valid = false;
    }

    // 校验结算账户
    if (!this.data.defaultBank) {
      wx.showToast({
        title: MESSAGE.bankCardInvalid,
        icon: 'none'
      });
      return false;
    }

    this.setData({ errors });
    return valid;
  },

  /**
   * 提交提现
   */
  async onSubmit() {
    // 校验表单
    if (!this.validateForm()) {
      return;
    }

    // 确认提现
    wx.showModal({
      title: '确认提现',
      content: `确认提现¥${this.data.withdrawAmount}到${this.data.defaultBank.bankName}（${this.data.defaultBank.cardNo.slice(-4)}）？`,
      success: async (res) => {
        if (res.confirm) {
          await this.submitWithdraw();
        }
      }
    });
  },

  /**
   * 提交提现申请
   */
  async submitWithdraw() {
    try {
      this.setData({ submitting: true });
      
      await request.post(API.withdraw.create, {
        amount: parseFloat(this.data.withdrawAmount),
        bankId: this.data.defaultBank.id
      });
      
      wx.showToast({
        title: MESSAGE.withdrawSuccess,
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.showToast({
        title: err.message || '提现失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 跳转结算账户管理
   */
  goToBank() {
    wx.navigateTo({
      url: '/pages/bank/bank'
    });
  },

  /**
   * 查看提现记录
   */
  goToWithdrawList() {
    wx.navigateTo({
      url: '/pages/webview/webview?type=withdraw&title=提现记录'
    });
  }
});