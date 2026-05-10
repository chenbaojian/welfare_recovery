// pages/buy/list/list.js - 买家卡券列表页
const request = require('../../../utils/request');
const { checkLogin } = require('../../../utils/auth');
const API = require('../../../config/api');
const { CARD_ICONS } = require('../../../config/constants');

Page({
  data: {
    cardTypeId: 0,
    cardTypeName: '',
    cardTypeIcon: '🎫',

    // 排序选项
    sortOptions: [
      { name: '价格最低', value: 'faceValueAsc' },
      { name: '价格最高', value: 'faceValueDesc' },
      { name: '折扣最低', value: 'discountAsc' }
    ],
    activeSort: 'faceValueAsc',

    // 卡券列表
    cards: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,

    // 搜索关键词
    keyword: ''
  },

  onLoad(options) {
    const { cardTypeId, keyword } = options;

    if (keyword) {
      this.setData({ keyword });
    }

    if (cardTypeId) {
      this.setData({ cardTypeId: parseInt(cardTypeId) });
      this.loadCardList();
    } else if (keyword) {
      // 搜索模式：遍历所有类型搜索
      this.searchAllTypes(keyword);
    }
  },

  /**
   * 搜索所有类型
   */
  async searchAllTypes(keyword) {
    try {
      // 先获取所有可售卡券种类
      const types = await request.get(API.buy.cardTypes);
      if (types && types.length > 0) {
        // 对每个类型搜索
        const allCards = [];
        for (const type of types) {
          const data = await request.get(API.buy.cardList, {
            cardTypeId: type.id,
            sortBy: 'price_asc',
            page: 1,
            pageSize: 50
          });
          if (data && data.list) {
            const filtered = data.list.filter(card =>
              card.cardTypeName.includes(keyword) ||
              (card.faceValue && String(card.faceValue).includes(keyword))
            );
            allCards.push(...filtered);
          }
        }
        this.setData({
          cards: allCards,
          total: allCards.length,
          hasMore: false,
          loading: false,
          cardTypeName: '搜索结果'
        });
      }
    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({ loading: false });
    }
  },

  /**
   * 加载卡券列表
   */
  async loadCardList() {
    if (!this.data.cardTypeId) return;

    this.setData({ loading: true });

    try {
      const params = {
        cardTypeId: this.data.cardTypeId,
        sortBy: this.data.activeSort,
        page: this.data.page,
        pageSize: this.data.pageSize
      };

      const data = await request.get(API.buy.cardList, params);

      if (data) {
        const cards = (data.list || []).map(item => ({
          ...item,
          icon: CARD_ICONS[item.cardTypeId] || '🎫',
          discountText: item.discountRate ? (item.discountRate * 10).toFixed(1) : ''
        }));

        this.setData({
          cards: this.data.page === 1 ? cards : [...this.data.cards, ...cards],
          total: data.totalAvailable || data.total || 0,
          hasMore: cards.length >= this.data.pageSize,
          loading: false,
          cardTypeName: cards.length > 0 ? cards[0].cardTypeName : '卡券列表',
          cardTypeIcon: cards.length > 0 ? cards[0].icon : '🎫'
        });
      } else {
        this.setData({
          cards: [],
          total: 0,
          hasMore: false,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载卡券列表失败:', err);
      this.setData({
        cards: [],
        loading: false
      });
    }
  },

  /**
   * 切换排序
   */
  onSortChange(e) {
    const { value } = e.currentTarget.dataset;

    this.setData({
      activeSort: value,
      page: 1,
      cards: []
    });

    this.loadCardList();
  },

  /**
   * 点击卡券 - 跳转到购买详情页
   */
  onCardClick(e) {
    const { id } = e.currentTarget.dataset;

    // 检查登录
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
    const userInfo = wx.getStorageSync('userInfo');
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
      url: `/pages/buy/detail/detail?recycleOrderId=${id}`
    });
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadCardList();
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ page: 1, cards: [] });
    if (this.data.cardTypeId) {
      this.loadCardList();
    } else if (this.data.keyword) {
      this.searchAllTypes(this.data.keyword);
    }
    wx.stopPullDownRefresh();
  }
});