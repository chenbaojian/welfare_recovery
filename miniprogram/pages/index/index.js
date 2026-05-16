// pages/index/index.js
const request = require('../../utils/request');
const { checkLogin, requireLogin } = require('../../utils/auth');
const cache = require('../../utils/cache');
const API = require('../../config/api');
const { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, DEFAULT_ICON_LABEL, CARD_ICONS, USER_MODE } = require('../../config/constants');
const config = require('../../config/index');

Page({
  data: {
    // 模式切换
    currentMode: USER_MODE.SELLER, // 当前模式 SELLER/BUYER
    showModeMenu: false,           // 下拉菜单是否显示

    // 卖家模式数据
    cardTypes: [],
    allCardTypes: [],
    hotCards: [],

    // 买家模式数据
    buyCardTypes: [],    // 可售卡券种类
    buyHotCards: [],     // 买家热门卡券

    // 通用
    loading: true,
    searchValue: '',
    isLoggedIn: false,
    userInfo: null,
    skeletonLoading: true
  },

  onLoad(options) {
    // 保存推广人ID到全局（用于新用户注册时绑定推广关系）
    if (options && options.promoterId) {
      wx.setStorageSync('promoterId', options.promoterId);
    }

    // 从本地存储恢复模式
    const savedMode = wx.getStorageSync(config.storageKeys.currentMode) || USER_MODE.SELLER;

    this.setData({
      currentMode: savedMode
    });

    this.initPage();
  },

  onShow() {
    this.checkLoginStatus();
  },

  /**
   * 初始化页面
   */
  initPage() {
    this.checkLoginStatus();
    this.loadCardTypes();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = checkLogin();
    const userInfo = wx.getStorageSync('userInfo');

    this.setData({
      isLoggedIn,
      userInfo
    });
  },

  /**
   * 切换下拉菜单显示
   */
  onToggleModeMenu() {
    this.setData({
      showModeMenu: !this.data.showModeMenu
    });
  },

  /**
   * 关闭下拉菜单
   */
  onCloseModeMenu() {
    this.setData({ showModeMenu: false });
  },

  /**
   * 选择模式
   */
  onSelectMode(e) {
    const mode = e.currentTarget.dataset.mode;

    if (mode === this.data.currentMode) {
      this.setData({ showModeMenu: false });
      return;
    }

    this.setData({
      currentMode: mode,
      showModeMenu: false,
      loading: true,
      searchValue: ''
    });

    // 持久化模式
    wx.setStorageSync(config.storageKeys.currentMode, mode);

    // 重新加载对应数据
    this.loadCardTypes();
  },

  /**
   * 加载卡券类型（根据模式）
   */
  async loadCardTypes() {
    if (this.data.currentMode === USER_MODE.SELLER) {
      this.loadSellerCardTypes();
    } else {
      this.loadBuyerCardTypes();
    }
  },

  /**
   * 加载卖家模式卡券类型（从数据库获取）
   */
  async loadSellerCardTypes() {
    try {
      const data = await request.get(API.card.typeList);
      if (data && data.length > 0) {
        this.processCardTypes(data);
      } else {
        this.setData({
          cardTypes: [],
          allCardTypes: [],
          hotCards: [],
          loading: false,
          skeletonLoading: false
        });
      }
    } catch (err) {
      console.error('加载卡券类型失败:', err);
      this.setData({
        cardTypes: [],
        allCardTypes: [],
        hotCards: [],
        loading: false,
        skeletonLoading: false
      });
    }
  },

  /**
   * 加载买家模式可售卡券种类
   */
  async loadBuyerCardTypes() {
    try {
      const data = await request.get(API.buy.cardTypes);

      if (data && data.length > 0) {
        const buyCardTypes = data.map(item => {
          const categoryColor = CATEGORY_COLORS[item.category] || DEFAULT_CATEGORY_COLOR;
          return {
            ...item,
            iconUrl: item.iconUrl || null,
            iconLabel: (item.name && item.name.length >= 2) ? item.name.substring(0, 2) : (item.name || DEFAULT_ICON_LABEL),
            iconColor: item.iconColor || categoryColor.color,
            iconBgColor: item.iconBgColor || categoryColor.bgColor
          };
        });

        // 热门卡券（有库存的取前3个）
        const buyHotCards = buyCardTypes
          .filter(item => item.availableCount > 0)
          .slice(0, 3);

        this.setData({
          buyCardTypes,
          buyHotCards,
          loading: false,
          skeletonLoading: false
        });
      } else {
        this.setData({
          buyCardTypes: [],
          buyHotCards: [],
          loading: false,
          skeletonLoading: false
        });
      }
    } catch (err) {
      console.error('加载买家卡券种类失败:', err);
      this.setData({
        buyCardTypes: [],
        buyHotCards: [],
        loading: false,
        skeletonLoading: false
      });
    }
  },

  /**
   * 处理卖家卡券类型数据
   */
  processCardTypes(data) {
    const cardTypes = data.map(item => {
      const categoryColor = CATEGORY_COLORS[item.category] || DEFAULT_CATEGORY_COLOR;
      return {
        ...item,
        iconUrl: item.iconUrl || null,
        iconLabel: (item.name && item.name.length >= 2) ? item.name.substring(0, 2) : (item.name || DEFAULT_ICON_LABEL),
        iconColor: item.iconColor || categoryColor.color,
        iconBgColor: item.iconBgColor || categoryColor.bgColor,
        isHot: item.isHot || false
      };
    });

    const hotCards = cardTypes
      .filter(item => item.isHot)
      .slice(0, 3);

    this.setData({
      cardTypes,
      allCardTypes: cardTypes,
      hotCards,
      loading: false,
      skeletonLoading: false
    });
  },

  /**
   * 图标加载失败，降级为默认图标
   */
  onIconError(e) {
    const id = e.currentTarget.dataset.id;
    const key = `cardTypes[${this.data.cardTypes.findIndex(item => item.id === id)}].iconUrl`;
    this.setData({ [key]: '' });
  },

  /**
   * 搜索卡券
   */
  onSearch(e) {
    const value = e.detail || '';
    this.setData({ searchValue: value });

    if (this.data.currentMode === USER_MODE.SELLER) {
      if (!value) {
        this.setData({ cardTypes: this.data.allCardTypes });
        return;
      }
      const filtered = this.data.allCardTypes.filter(
        item => item.name.includes(value) ||
                (item.description && item.description.includes(value))
      );
      this.setData({ cardTypes: filtered });
    } else {
      // 买家模式搜索：跳转到列表页搜索
      if (value) {
        wx.navigateTo({
          url: `/pages/buy/list/list?keyword=${encodeURIComponent(value)}`
        });
      }
    }
  },

  /**
   * 清空搜索
   */
  onSearchClear() {
    this.setData({
      searchValue: ''
    });
    if (this.data.currentMode === USER_MODE.SELLER) {
      this.setData({ cardTypes: this.data.allCardTypes });
    }
  },

  /**
   * 选择卡券类型（卖家模式）
   */
  onSelectCard(e) {
    const { id } = e.currentTarget.dataset;

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

    const userInfo = this.data.userInfo;
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

    // 跳转到卡券列表页（展示该类型下的所有卡产品）
    const cardType = this.data.allCardTypes.find(item => item.id === id);
    const typeName = cardType ? cardType.name : '';
    wx.navigateTo({
      url: `/pages/card/list/list?typeId=${id}&typeName=${encodeURIComponent(typeName)}`
    });
  },

  /**
   * 选择买家卡券类型（买家模式）
   */
  onSelectBuyCard(e) {
    const { id } = e.currentTarget.dataset;

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

    const userInfo = this.data.userInfo;
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

    wx.navigateTo({
      url: `/pages/buy/list/list?cardTypeId=${id}`
    });
  },

  /**
   * 点击热门卡券
   */
  onHotCardTap(e) {
    const { id } = e.currentTarget.dataset;
    if (this.data.currentMode === USER_MODE.SELLER) {
      this.onSelectCard({ currentTarget: { dataset: { id } } });
    } else {
      this.onSelectBuyCard({ currentTarget: { dataset: { id } } });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    cache.remove('card_types');
    this.loadCardTypes();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const modeText = this.data.currentMode === USER_MODE.BUYER ? '低价购卡' : '闲置卡券一键变现';
    return {
      title: `福利回收 - ${modeText}`,
      path: '/pages/index/index'
    };
  },

  /**
   * 跳转登录
   */
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});