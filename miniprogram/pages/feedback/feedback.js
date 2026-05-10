// pages/feedback/feedback.js
import request from '../../utils/request';
import { checkLogin, getUserInfo } from '../../utils/auth';
import API, { LOCAL_DEV } from '../../config/api';
import Toast from '@vant/weapp/dist/toast/toast';

// 反馈类型
const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '功能建议', icon: '💡' },
  { value: 'experience', label: '体验问题', icon: '📱' },
  { value: 'bug',        label: 'Bug反馈',  icon: '🐛' },
  { value: 'other',      label: '其他',      icon: '📝' }
];

// 反馈状态映射
const STATUS_MAP = {
  pending:    { label: '待处理', color: '#FAAD14' },
  processing: { label: '处理中', color: '#1890FF' },
  replied:    { label: '已回复', color: '#52C41A' },
  closed:     { label: '已关闭', color: '#999999' }
};

Page({
  data: {
    // 反馈类型
    typeList: FEEDBACK_TYPES,
    selectedType: 'suggestion',

    // 反馈内容
    feedbackContent: '',
    contentLength: 0,

    // 图片
    imageList: [],

    // 联系方式
    feedbackContact: '',

    // 反馈记录
    feedbackRecords: []
  },

  onLoad() {
    this.loadFeedbackRecords();
  },

  onShow() {
    this.loadFeedbackRecords();
  },

  /**
   * 选择反馈类型
   */
  onSelectType(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedType: value });
  },

  /**
   * 输入反馈内容
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
    this.setData({ feedbackContact: e.detail.value });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const remaining = 3 - this.data.imageList.length;
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imageList: [...this.data.imageList, ...res.tempFilePaths]
        });
      }
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.imageList
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const imageList = [...this.data.imageList];
    imageList.splice(index, 1);
    this.setData({ imageList });
  },

  /**
   * 提交反馈
   */
  async onSubmitFeedback() {
    const { selectedType, feedbackContent, feedbackContact, imageList } = this.data;

    // 校验反馈内容
    if (!feedbackContent || feedbackContent.trim().length < 10) {
      Toast('反馈内容至少需要10个字');
      return;
    }

    // 获取用户信息
    const isLoggedIn = checkLogin();
    const userInfo = isLoggedIn ? getUserInfo() : null;

    const feedbackData = {
      type: selectedType,
      content: feedbackContent.trim(),
      images: imageList,
      contact: feedbackContact.trim(),
      userId: userInfo ? userInfo.id : null
    };

    try {
      if (LOCAL_DEV) {
        await this._mockSubmitFeedback(feedbackData);
      } else {
        await request.post(API.common.feedback, feedbackData);
      }

      Toast('反馈已提交，感谢您的意见');

      // 清空表单
      this.setData({
        selectedType: 'suggestion',
        feedbackContent: '',
        contentLength: 0,
        imageList: [],
        feedbackContact: ''
      });

      // 刷新反馈记录
      this.loadFeedbackRecords();
    } catch (err) {
      console.error('提交反馈失败:', err);
      Toast('提交失败，请稍后重试');
    }
  },

  /**
   * 加载反馈记录
   */
  async loadFeedbackRecords() {
    const isLoggedIn = checkLogin();
    if (!isLoggedIn) {
      this.setData({ feedbackRecords: [] });
      return;
    }

    const userInfo = getUserInfo();

    try {
      if (LOCAL_DEV) {
        const records = this._mockGetFeedbackRecords(userInfo.id);
        this.setData({ feedbackRecords: records });
      } else {
        const res = await request.get(API.common.feedbackList, {
          userId: userInfo.id,
          page: 1,
          pageSize: 10
        });
        const records = (res.list || []).map(item => this._formatRecord(item));
        this.setData({ feedbackRecords: records });
      }
    } catch (err) {
      console.error('加载反馈记录失败:', err);
    }
  },

  /**
   * 格式化反馈记录
   */
  _formatRecord(item) {
    const typeObj = FEEDBACK_TYPES.find(t => t.value === item.type) || FEEDBACK_TYPES[3];
    const statusObj = STATUS_MAP[item.status] || STATUS_MAP.pending;

    return {
      ...item,
      typeIcon: typeObj.icon,
      typeLabel: typeObj.label,
      statusLabel: statusObj.label,
      statusColor: statusObj.color
    };
  },

  /**
   * 模拟提交反馈
   */
  _mockSubmitFeedback(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[mock] 提交反馈:', data);
        // 保存到本地存储
        const key = 'feedback_records';
        const records = wx.getStorageSync(key) || [];
        const typeObj = FEEDBACK_TYPES.find(t => t.value === data.type) || FEEDBACK_TYPES[3];
        records.unshift({
          id: 'FB' + Date.now(),
          type: data.type,
          typeIcon: typeObj.icon,
          typeLabel: typeObj.label,
          content: data.content,
          images: data.images,
          contact: data.contact,
          userId: data.userId,
          status: 'processing',
          statusLabel: '处理中',
          statusColor: '#1890FF',
          reply: '',
          createTime: new Date().toLocaleString()
        });
        wx.setStorageSync(key, records);
        resolve({ id: 'FB' + Date.now(), status: 'pending' });
      }, 500);
    });
  },

  /**
   * 模拟获取反馈记录
   */
  _mockGetFeedbackRecords(userId) {
    const key = 'feedback_records';
    const records = wx.getStorageSync(key) || [];

    // 如果没有记录，添加一条模拟数据
    if (records.length === 0) {
      const mockRecords = [
        {
          id: 'FB202401010001',
          type: 'suggestion',
          typeIcon: '💡',
          typeLabel: '功能建议',
          content: '希望增加更多卡券类型，比如支持星巴克礼品卡回收',
          images: [],
          contact: '13800138000',
          userId: userId,
          status: 'replied',
          statusLabel: '已回复',
          statusColor: '#52C41A',
          reply: '感谢您的建议，我们正在评估新增更多卡券类型的可行性，预计下月上线星巴克礼品卡回收功能。',
          createTime: '2024-01-10 14:30:00'
        },
        {
          id: 'FB202401020001',
          type: 'bug',
          typeIcon: '🐛',
          typeLabel: 'Bug反馈',
          content: '提交订单时页面偶尔会卡顿，需要等待很久才能提交成功',
          images: [],
          contact: '',
          userId: userId,
          status: 'processing',
          statusLabel: '处理中',
          statusColor: '#1890FF',
          reply: '',
          createTime: '2024-01-15 09:00:00'
        }
      ];
      wx.setStorageSync(key, mockRecords);
      return mockRecords;
    }

    return records.map(item => this._formatRecord(item));
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