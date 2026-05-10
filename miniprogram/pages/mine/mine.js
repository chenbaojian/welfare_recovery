// pages/mine/mine.js
const request = require('../../utils/request');
const { checkLogin, clearLoginInfo, getUserInfo } = require('../../utils/auth');
const { maskPhone, maskIdCard } = require('../../utils/crypto');
const { formatMoney } = require('../../utils/util');
const API = require('../../config/api');
const { getAccount } = require('../../utils/userData');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    loading: false,

    // 卖家账户信息
    balance: '0.00',
    totalRecycle: '0.00',
    withdrawn: '0.00',
    orderCount: 0,

    // 买家账户信息
    totalBuy: '0.00',
    buyOrderCount: 0
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadAccountInfo();
  },

  /**
   * 初始化页面
   */
  initPage() {
    this.checkLoginStatus();
    this.loadAccountInfo();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = checkLogin();
    const userInfo = getUserInfo();

    this.setData({
      isLoggedIn,
      userInfo: userInfo ? {
        ...userInfo,
        phone: userInfo.phone ? maskPhone(userInfo.phone) : '',
        idCard: userInfo.idCard ? maskIdCard(userInfo.idCard) : ''
      } : null
    });
  },

  /**
   * 加载账户信息
   */
  async loadAccountInfo() {
    const account = getAccount();

    this.setData({
      balance: formatMoney(account.balance),
      totalRecycle: formatMoney(account.totalRecycle),
      withdrawn: formatMoney(account.withdrawn),
      orderCount: account.orderCount,
      totalBuy: formatMoney(account.totalBuy || 0),
      buyOrderCount: account.buyOrderCount || 0
    });

    // 如果已登录，从后端获取实时统计数据
    if (this.data.isLoggedIn) {
      await Promise.all([
        this.loadSellerStats(),
        this.loadBuyerStats()
      ]);
    }
  },

  /**
   * 加载卖家统计数据（从后端实时获取）
   */
  async loadSellerStats() {
    try {
      const [userData, withdrawData] = await Promise.all([
        request.get(API.user.getInfo),
        request.get(API.withdraw.list, { page: 1, pageSize: 50 }).catch(() => null)
      ]);

      if (userData) {
        // 计算已提现金额
        let withdrawn = 0;
        if (withdrawData && withdrawData.list) {
          withdrawn = withdrawData.list
            .filter(item => item.status === 'SUCCESS' || item.status === 'APPROVED')
            .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        }

        this.setData({
          balance: formatMoney(userData.balance || 0),
          totalRecycle: formatMoney(userData.totalRecycle || 0),
          withdrawn: formatMoney(withdrawn),
          orderCount: userData.orderCount || 0
        });
      }
    } catch (err) {
      console.error('加载卖家统计失败:', err);
    }
  },

  /**
   * 加载买家统计数据
   */
  async loadBuyerStats() {
    try {
      const data = await request.get(API.buy.orderStats);
      if (data) {
        this.setData({
          totalBuy: formatMoney(data.totalBuy || 0),
          buyOrderCount: data.buyOrderCount || 0
        });
      }
    } catch (err) {
      console.error('加载买家统计失败:', err);
    }
  },

  /**
   * 跳转登录
   */
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  /**
   * 跳转实名认证
   */
  goToVerify() {
    wx.navigateTo({
      url: '/pages/verify/verify'
    });
  },

  /**
   * 跳转提现
   */
  goToWithdraw() {
    if (!this.data.userInfo?.isVerified) {
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

    wx.navigateTo({
      url: '/pages/withdraw/withdraw'
    });
  },

  /**
   * 跳转结算账户
   */
  goToBank() {
    if (!this.data.userInfo?.isVerified) {
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

    wx.navigateTo({
      url: '/pages/bank/bank'
    });
  },

  /**
   * 跳转推广中心
   */
  goToPromotion() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/promotion/promotion'
    });
  },

  /**
   * 跳转订单列表
   */
  goToOrders() {
    wx.switchTab({
      url: '/pages/order/list/list'
    });
  },

  /**
   * 跳转购买订单列表
   */
  goToBuyOrders() {
    wx.navigateTo({
      url: '/pages/buy/order/list/list'
    });
  },

  /**
   * 联系客服
   */
  onContactService() {
    wx.navigateTo({
      url: '/pages/contact/contact'
    });
  },

  /**
   * 意见反馈
   */
  onFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  /**
   * 关于我们
   */
  onAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },

  /**
   * 执行退出登录
   */
  async logout() {
    if (API.LOCAL_DEV) {
      try {
        await request.post(API.user.logout);
      } catch (err) {
        console.error('退出登录失败:', err);
      }
    }

    clearLoginInfo();

    this.setData({
      isLoggedIn: false,
      userInfo: null,
      balance: '0.00',
      totalRecycle: '0.00',
      withdrawn: '0.00',
      orderCount: 0,
      totalBuy: '0.00',
      buyOrderCount: 0
    });

    wx.showToast({
      title: '已退出登录',
      icon: 'success'
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