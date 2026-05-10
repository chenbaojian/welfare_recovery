// pages/contact/contact.js
import request from '../../utils/request';
import { checkLogin, getUserInfo } from '../../utils/auth';
import API, { LOCAL_DEV } from '../../config/api';
import Toast from '@vant/weapp/dist/toast/toast';

// 客服渠道配置
const SERVICE_CHANNELS = {
  phone: {
    phoneNumber: '400-888-8888'
  },
  wechat: {
    wechatId: 'FLHS_kefu'
  }
};

// 问题分类
const CATEGORY_LIST = [
  { value: 'recycle', label: '回收问题' },
  { value: 'order', label: '订单问题' },
  { value: 'withdraw', label: '提现问题' },
  { value: 'verify', label: '认证问题' },
  { value: 'other', label: '其他问题' }
];

// 常见问题列表
const FAQ_LIST = [
  {
    id: 1,
    category: 'recycle',
    question: '如何提交回收订单？',
    answer: '在首页选择您要回收的卡券类型，选择面值档位，输入卡号和卡密，确认回收价格后点击"提交订单"即可。提交前请确保卡券有效且未使用。'
  },
  {
    id: 2,
    category: 'recycle',
    question: '回收多久能到账？',
    answer: '正常情况下，卡券验证通过后1-30分钟内完成回收，回收金额将实时计入您的账户余额。您可以在"我的"页面查看余额，并申请提现。'
  },
  {
    id: 3,
    category: 'withdraw',
    question: '如何提现？',
    answer: '完成实名认证后，在"我的"页面点击"提现"，输入提现金额并选择结算账户，提交后1-3个工作日到账。最低提现金额为10元。'
  },
  {
    id: 4,
    category: 'verify',
    question: '实名认证失败怎么办？',
    answer: '请确认您输入的姓名和身份证号准确无误。如果信息正确但仍认证失败，可能是系统校验异常，请联系在线客服协助处理。'
  },
  {
    id: 5,
    category: 'order',
    question: '卡券提交后能撤销吗？',
    answer: '卡券提交后无法撤销。请在提交前仔细核对卡号、卡密和面值信息，确保卡券有效且未使用，避免提交错误。'
  },
  {
    id: 6,
    category: 'order',
    question: '订单状态有哪些？',
    answer: '订单状态包括：待处理（刚提交）、处理中（正在验证卡券）、已完成（验证成功并结算）、已失败（卡券验证失败）、已取消（用户主动取消）。'
  },
  {
    id: 7,
    category: 'recycle',
    question: '回收折扣是固定的吗？',
    answer: '回收折扣根据卡券类型和面值不同有所差异，具体折扣在您选择卡券类型后会实时显示。折扣可能随市场行情调整，以提交时的折扣为准。'
  },
  {
    id: 8,
    category: 'withdraw',
    question: '提现到账时间是多少？',
    answer: '提现申请提交后，一般1-3个工作日到账。节假日可能延迟，具体以银行处理时间为准。如超过3个工作日未到账，请联系客服查询。'
  }
];

Page({
  data: {
    // FAQ
    faqList: FAQ_LIST,
    activeFaqId: null,

    // 留言反馈
    categoryList: CATEGORY_LIST,
    selectedCategory: '',
    selectedCategoryLabel: '',
    feedbackContent: '',
    feedbackContact: '',
    contentLength: 0,

    // 分类选择弹窗
    showCategoryPicker: false,
    tempCategory: '',
    tempCategoryLabel: ''
  },

  onLoad() {
    // 页面加载
  },

  /**
   * 拨打电话客服
   */
  onCallPhone() {
    wx.makePhoneCall({
      phoneNumber: SERVICE_CHANNELS.phone.phoneNumber,
      fail: () => {
        Toast('拨打电话失败，请尝试其他方式');
      }
    });
  },

  /**
   * 复制微信客服号
   */
  onCopyWechatId() {
    wx.setClipboardData({
      data: SERVICE_CHANNELS.wechat.wechatId,
      success: () => {
        Toast('微信号已复制，请在微信中搜索添加');
      }
    });
  },

  /**
   * 切换FAQ展开/折叠
   */
  onToggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      activeFaqId: this.data.activeFaqId === id ? null : id
    });
  },

  /**
   * 显示分类选择弹窗
   */
  onShowCategoryPicker() {
    this.setData({
      showCategoryPicker: true,
      tempCategory: this.data.selectedCategory,
      tempCategoryLabel: this.data.selectedCategoryLabel
    });
  },

  /**
   * 选择分类
   */
  onSelectCategory(e) {
    const { value, label } = e.currentTarget.dataset;
    this.setData({
      tempCategory: value,
      tempCategoryLabel: label
    });
  },

  /**
   * 确认分类选择
   */
  onConfirmCategory() {
    this.setData({
      selectedCategory: this.data.tempCategory,
      selectedCategoryLabel: this.data.tempCategoryLabel,
      showCategoryPicker: false
    });
  },

  /**
   * 关闭分类选择弹窗
   */
  onCloseCategoryPicker() {
    this.setData({
      showCategoryPicker: false
    });
  },

  /**
   * 输入问题描述
   */
  onInputContent(e) {
    const content = e.detail.value;
    this.setData({
      feedbackContent: content,
      contentLength: content.length
    });
  },

  /**
   * 输入联系方式
   */
  onInputContact(e) {
    this.setData({
      feedbackContact: e.detail.value
    });
  },

  /**
   * 提交留言反馈
   */
  async onSubmitFeedback() {
    const { selectedCategory, feedbackContent, feedbackContact } = this.data;

    // 校验问题分类
    if (!selectedCategory) {
      Toast('请选择问题分类');
      return;
    }

    // 校验问题描述
    if (!feedbackContent || feedbackContent.trim().length < 10) {
      Toast('问题描述至少需要10个字');
      return;
    }

    // 校验联系方式
    if (!feedbackContact || feedbackContact.trim() === '') {
      Toast('请输入联系方式');
      return;
    }

    // 获取用户信息（可选）
    const isLoggedIn = checkLogin();
    const userInfo = isLoggedIn ? getUserInfo() : null;

    const feedbackData = {
      category: selectedCategory,
      content: feedbackContent.trim(),
      contact: feedbackContact.trim(),
      userId: userInfo ? userInfo.id : null
    };

    try {
      if (LOCAL_DEV) {
        // 本地开发模式模拟提交
        await this._mockSubmitFeedback(feedbackData);
      } else {
        // 调用后端接口
        await request.post(API.common.feedback, feedbackData);
      }

      Toast('留言已提交，客服将在24小时内回复');

      // 清空表单
      this.setData({
        selectedCategory: '',
        selectedCategoryLabel: '',
        feedbackContent: '',
        feedbackContact: '',
        contentLength: 0
      });
    } catch (err) {
      console.error('提交留言失败:', err);
      Toast('提交失败，请稍后重试');
    }
  },

  /**
   * 模拟提交留言反馈
   */
  _mockSubmitFeedback(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[mock] 提交留言反馈:', data);
        resolve({
          id: 'FB' + Date.now(),
          status: 'pending'
        });
      }, 500);
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '福利回收 - 闲置卡券一键变现',
      path: '/pages/index/index'
    };
  }
});