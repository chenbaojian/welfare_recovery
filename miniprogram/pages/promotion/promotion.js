// pages/promotion/promotion.js
const request = require('../../utils/request');
const { checkLogin } = require('../../utils/auth');
const API = require('../../config/api');

Page({
  data: {
    loading: false,
    showRulesModal: false,

    // 统计数据
    totalPeople: 0,
    totalReward: '0.00',
    pendingReward: '0.00',
    paidReward: '0.00',
    registerCount: 0,
    tradeCount: 0,

    // 奖励配置
    rewardConfig: {
      registerAmount: 2,
      tradeAmount: 8
    },
    totalPerUser: '10.00',

    // 推广记录
    records: [],

    // 分享信息
    shareInfo: null
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    if (this.data.loading) return;
    this.loadData();
  },

  /**
   * 加载推广数据
   */
  async loadData() {
    if (!checkLogin()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ loading: true });

    try {
      const data = await request.get(API.promotion.stats);

      if (data) {
        const config = data.rewardConfig || this.data.rewardConfig;
        const registerAmount = parseFloat(config.registerAmount) || 2;
        const tradeAmount = parseFloat(config.tradeAmount) || 8;

        this.setData({
          totalPeople: data.totalPeople || 0,
          totalReward: data.totalReward || '0.00',
          pendingReward: data.pendingReward || '0.00',
          paidReward: data.paidReward || '0.00',
          registerCount: data.registerCount || 0,
          tradeCount: data.tradeCount || 0,
          records: data.records || [],
          rewardConfig: config,
          totalPerUser: (registerAmount + tradeAmount).toFixed(2),
          shareInfo: data.shareInfo || null
        });
      }
    } catch (err) {
      console.error('加载推广数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 分享给好友
   */
  onShareLink() {
    // 使用微信转发功能
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 查看活动规则
   */
  onViewRules() {
    this.setData({ showRulesModal: true });
  },

  /**
   * 关闭规则弹窗
   */
  onCloseRules() {
    this.setData({ showRulesModal: false });
  },

  /**
   * 分享给好友（小程序转发）
   */
  onShareAppMessage() {
    const shareInfo = this.data.shareInfo || {};
    const userInfo = wx.getStorageSync('userInfo') || {};
    const promoterId = userInfo.id || '';
    const sharePath = promoterId ? `/pages/index/index?promoterId=${promoterId}` : '/pages/index/index';
    return {
      title: shareInfo.shareTitle || '闲置卡券一键变现，快来福利回收看看吧！',
      path: sharePath,
      imageUrl: ''
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const shareInfo = this.data.shareInfo || {};
    const userInfo = wx.getStorageSync('userInfo') || {};
    const promoterId = userInfo.id || '';
    return {
      title: shareInfo.shareTitle || '闲置卡券一键变现，快来福利回收看看吧！',
      query: promoterId ? `promoterId=${promoterId}` : ''
    };
  }
});
