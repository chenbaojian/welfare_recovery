// pages/index/index.js
const request = require('../../utils/request');
const { checkLogin, requireLogin } = require('../../utils/auth');
const cache = require('../../utils/cache');
const API = require('../../config/api');
const { CARD_ICONS, USER_MODE } = require('../../config/constants');
const config = require('../../config/index');

// 卡券类型数据（卖家模式本地数据）
const CARD_TYPES_DATA = [
  { id: 'phone', name: '电话卡', isHot: true, discount: 0.98, description: '支持移动/联通/电信', icon: '📱' },
  { id: 'gas', name: '加油卡', isHot: true, discount: 0.95, description: '中石化/中石油加油卡', icon: '⛽' },
  { id: 'game', name: '游戏卡', isHot: false, discount: 0.90, description: '网易一卡通等', icon: '🎮',
    children: [
      { id: 'netease', name: '网易一卡通', discount: 0.90, description: '网易一卡通', icon: '🎮' }
    ]
  },
  { id: 'music', name: '影音券', isHot: false, discount: 0.80, description: '爱奇艺/腾讯视频等', icon: '🎵',
    children: [
      { id: 'iqiyi', name: '爱奇艺会员', discount: 0.80, description: '爱奇艺会员', icon: '📺' },
      { id: 'tencent', name: '腾讯视频会员', discount: 0.80, description: '腾讯视频会员', icon: '🎬' },
      { id: 'youku', name: '优酷视频会员', discount: 0.80, description: '优酷视频会员', icon: '🎥' },
      { id: 'mgtv', name: '芒果TV会员', discount: 0.80, description: '芒果TV会员', icon: '📱' },
      { id: 'jdmovie', name: '京东电影', discount: 0.80, description: '京东电影', icon: '🎞️' },
      { id: 'ximalaya', name: '喜马拉雅FM', discount: 0.80, description: '喜马拉雅FM', icon: '📻' }
    ]
  },
  { id: 'ecommerce', name: '电商卡', isHot: true, discount: 0.97, description: '京东超市卡/永辉超市卡等', icon: '🛒',
    children: [
      { id: 'jdmarket', name: '京东超市卡', discount: 0.97, description: '京东超市卡', icon: '🛒' },
      { id: 'yonghui', name: '永辉超市卡', discount: 0.97, description: '永辉超市卡', icon: '🏪' },
      { id: 'meituan', name: '美团礼品卡', discount: 0.97, description: '美团礼品卡', icon: '🎁' },
      { id: 'tmall', name: '天猫超市卡', discount: 0.97, description: '天猫超市卡', icon: '🛍️' },
      { id: 'yintai', name: '银泰百货银泰卡', discount: 0.97, description: '银泰百货银泰卡', icon: '💳' },
      { id: 'suning', name: '苏宁易购礼品卡', discount: 0.97, description: '苏宁易购礼品卡', icon: '📦' },
      { id: 'zhongbai', name: '中百超市购物卡', discount: 0.97, description: '中百超市购物卡', icon: '🛃' }
    ]
  },
  { id: 'jd', name: '京东E卡', isHot: false, discount: 0.97, description: '京东E卡', icon: '📦' },
  { id: 'supermarket', name: '商超卡', isHot: false, discount: 0.92, description: '沃尔玛卡/盒马生鲜等', icon: '🏪',
    children: [
      { id: 'walmart', name: '沃尔玛卡', discount: 0.92, description: '沃尔玛卡', icon: '🏪' },
      { id: 'hema', name: '盒马生鲜', discount: 0.92, description: '盒马生鲜', icon: '🦐' },
      { id: 'pupu', name: '朴朴超市', discount: 0.92, description: '朴朴超市', icon: '🛒' },
      { id: 'xiaoxiang', name: '小象超市', discount: 0.92, description: '小象超市', icon: '🐘' },
      { id: 'hongqi', name: '红旗连锁', discount: 0.92, description: '红旗连锁（邮寄）', icon: '🔴' }
    ]
  },
  { id: 'food', name: '美食券', isHot: false, discount: 0.88, description: '瑞幸咖啡/肯德基等', icon: '🍔',
    children: [
      { id: 'luckin', name: '瑞幸咖啡', discount: 0.88, description: '瑞幸咖啡', icon: '☕' },
      { id: 'kfc', name: '肯德基', discount: 0.88, description: '肯德基', icon: '🍗' },
      { id: 'aidale', name: '爱达乐', discount: 0.88, description: '爱达乐', icon: '🥐' },
      { id: 'holiland', name: '好利来', discount: 0.88, description: '好利来', icon: '🎂' },
      { id: 'chagee', name: '霸王茶姬', discount: 0.88, description: '霸王茶姬', icon: '🧋' },
      { id: 'weiduomei', name: '味多美', discount: 0.88, description: '味多美', icon: '🥮' },
      { id: 'ganso', name: '元祖食品', discount: 0.88, description: '元祖食品', icon: '🍰' },
      { id: 'starbucks', name: '星巴克', discount: 0.88, description: '星巴克', icon: '☕' }
    ]
  },
  { id: 'meituan', name: '美团企业积分', isHot: false, discount: 0.75, description: '美团企业积分', icon: '🎁' },
  { id: 'laobao', name: '劳保积分', isHot: false, discount: 0.70, description: '劳保福利积分', icon: '💼' },
  { id: 'travel', name: '出行券', isHot: false, discount: 0.72, description: '融晟携程卡包/携程积分', icon: '🚗',
    children: [
      { id: 'rsctrip', name: '融晟携程卡包', discount: 0.72, description: '融晟携程卡包', icon: '🎫' },
      { id: 'ctrip', name: '携程积分', discount: 0.72, description: '携程旅行积分', icon: '✈️' }
    ]
  }
];

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
    this.loadCardTypes();
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
   * 加载卖家模式卡券类型
   */
  loadSellerCardTypes() {
    const cachedData = cache.get('card_types');
    if (cachedData) {
      this.processCardTypes(cachedData);
      this.setData({ loading: false, skeletonLoading: false });
      return;
    }

    setTimeout(() => {
      this.processCardTypes(CARD_TYPES_DATA);
      cache.set('card_types', CARD_TYPES_DATA, 10 * 60 * 1000);
      this.setData({ loading: false, skeletonLoading: false });
    }, 300);
  },

  /**
   * 加载买家模式可售卡券种类
   */
  async loadBuyerCardTypes() {
    try {
      const data = await request.get(API.buy.cardTypes);

      if (data && data.length > 0) {
        const buyCardTypes = data.map(item => ({
          ...item,
          icon: CARD_ICONS[item.cardTypeId] || item.icon || '🎫'
        }));

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
    const cardTypes = data.map(item => ({
      ...item,
      icon: item.icon || CARD_ICONS[item.id] || '🎫'
    }));

    const hotCards = cardTypes
      .filter(item => item.isHot)
      .slice(0, 3);

    this.setData({
      cardTypes,
      allCardTypes: cardTypes,
      hotCards
    });
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

    // 跳转到对应卡券详情页
    const routeMap = {
      'phone': '/pages/phone/list/list',
      'gas': '/pages/gas/list/list',
      'laobao': '/pages/laobao/detail/detail',
      'ctrip': '/pages/ctrip/detail/detail',
      'rsctrip': '/pages/rsctrip/detail/detail',
      'travel': '/pages/travel/list/list',
      'game': '/pages/game/list/list',
      'music': '/pages/music/list/list',
      'jd': '/pages/jd/detail/detail',
      'ecommerce': '/pages/ecommerce/list/list',
      'supermarket': '/pages/supermarket/list/list',
      'food': '/pages/food/list/list',
      'meituan': '/pages/meituan/detail/detail'
    };

    const url = routeMap[id] || `/pages/detail/detail?id=${id}`;
    wx.navigateTo({ url });
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