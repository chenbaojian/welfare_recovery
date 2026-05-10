// pages/bank/bank.js
import request from '../../utils/request';
import { validateBankCard } from '../../utils/validate';
import { formatBankCard, maskBankCard } from '../../utils/crypto';
import API from '../../config/api';
import { BANK_LIST } from '../../config/constants';

Page({
  data: {
    banks: [],           // 已绑定账户列表
    loading: false,
    
    // 添加账户弹窗
    showAddPopup: false,
    addForm: {
      bankCode: '',
      bankName: '',
      cardNo: '',
      realName: ''
    },
    errors: {
      cardNo: ''
    },
    
    // 银行选择器
    showBankPicker: false,
    bankList: BANK_LIST,
    selectedBank: null
  },

  onLoad() {
    this.loadBanks();
  },

  onShow() {
    this.loadBanks();
  },

  /**
   * 加载结算账户列表
   */
  async loadBanks() {
    try {
      this.setData({ loading: true });
      
      const data = await request.get(API.bank.list);
      
      // 处理银行卡号显示
      const banks = data.map(item => ({
        ...item,
        displayCardNo: maskBankCard(item.cardNo),
        icon: BANK_LIST.find(b => b.code === item.bankCode)?.icon || ''
      }));
      
      this.setData({
        banks,
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
   * 显示添加账户弹窗
   */
  onShowAddPopup() {
    // 获取用户实名信息
    const userInfo = wx.getStorageSync('userInfo');
    
    this.setData({
      showAddPopup: true,
      'addForm.realName': userInfo?.realName || ''
    });
  },

  /**
   * 关闭添加账户弹窗
   */
  onCloseAddPopup() {
    this.setData({
      showAddPopup: false,
      addForm: {
        bankCode: '',
        bankName: '',
        cardNo: '',
        realName: ''
      },
      selectedBank: null,
      errors: { cardNo: '' }
    });
  },

  /**
   * 显示银行选择器
   */
  onShowBankPicker() {
    this.setData({ showBankPicker: true });
  },

  /**
   * 选择银行
   */
  onBankConfirm(e) {
    const { value, index } = e.detail;
    const bank = this.data.bankList[index];
    
    this.setData({
      selectedBank: bank,
      'addForm.bankCode': bank.code,
      'addForm.bankName': bank.name,
      showBankPicker: false
    });
  },

  /**
   * 输入银行卡号
   */
  onCardNoInput(e) {
    let { value } = e.detail;
    
    // 只允许输入数字
    value = value.replace(/\D/g, '');
    
    // 格式化显示
    const formatted = formatBankCard(value);
    
    this.setData({
      'addForm.cardNo': value,
      'errors.cardNo': ''
    });
  },

  /**
   * 校验表单
   */
  validateForm() {
    const { bankCode, cardNo, realName } = this.data.addForm;
    const errors = {};
    let valid = true;

    // 校验银行
    if (!bankCode) {
      wx.showToast({
        title: '请选择银行',
        icon: 'none'
      });
      return false;
    }

    // 校验银行卡号
    if (!cardNo) {
      errors.cardNo = '请输入银行卡号';
      valid = false;
    } else if (!validateBankCard(cardNo)) {
      errors.cardNo = '请输入正确的银行卡号';
      valid = false;
    }

    // 校验姓名
    if (!realName) {
      wx.showToast({
        title: '请输入持卡人姓名',
        icon: 'none'
      });
      return false;
    }

    this.setData({ errors });
    return valid;
  },

  /**
   * 提交添加账户
   */
  async onSubmitAdd() {
    if (!this.validateForm()) {
      return;
    }

    try {
      const { bankCode, bankName, cardNo, realName } = this.data.addForm;
      
      await request.post(API.bank.add, {
        bankCode,
        bankName,
        cardNo,
        realName
      });
      
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
      
      // 关闭弹窗并刷新列表
      this.onCloseAddPopup();
      this.loadBanks();
    } catch (err) {
      wx.showToast({
        title: err.message || '添加失败',
        icon: 'none'
      });
    }
  },

  /**
   * 设置默认账户
   */
  async onSetDefault(e) {
    const { id } = e.currentTarget.dataset;
    
    try {
      await request.post(API.bank.setDefault, { bankId: id });
      
      wx.showToast({
        title: '设置成功',
        icon: 'success'
      });
      
      this.loadBanks();
    } catch (err) {
      wx.showToast({
        title: err.message || '设置失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除账户
   */
  async onDeleteBank(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该结算账户吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.post(API.bank.delete, { bankId: id });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            this.loadBanks();
          } catch (err) {
            wx.showToast({
              title: err.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});