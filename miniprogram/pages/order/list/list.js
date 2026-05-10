// pages/order/list/list.js
const request = require('../../../utils/request');
const API = require('../../../config/api');

Page({
  data: {
    tabs: [
      { name: '全部', value: '' },
      { name: '待处理', value: 'PENDING' },
      { name: '处理中', value: 'PROCESSING' },
      { name: '已完成', value: 'SUCCESS' },
      { name: '已失败', value: 'FAILED' }
    ],
    activeTab: 0,
    status: '',

    // 订单数据（卖家+买家合并）
    orders: [],
    loading: false,
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  /**
   * 切换Tab
   */
  onTabChange(e) {
    const { index } = e.detail;
    const status = this.data.tabs[index].value;

    this.setData({
      activeTab: index,
      status,
      page: 1,
      orders: []
    });

    this.loadOrders();
  },

  /**
   * 加载订单列表（同时加载卖家和买家订单，合并排序）
   */
  async loadOrders() {
    this.setData({ loading: true });

    try {
      // 并行请求卖家和买家订单
      const [sellerResult, buyerResult] = await Promise.allSettled([
        this.fetchSellerOrders(),
        this.fetchBuyerOrders()
      ]);

      let sellerOrders = sellerResult.status === 'fulfilled' ? sellerResult.value : [];
      let buyerOrders = buyerResult.status === 'fulfilled' ? buyerResult.value : [];

      // 按状态筛选
      if (this.data.status) {
        sellerOrders = sellerOrders.filter(item => item.status === this.data.status);
        buyerOrders = buyerOrders.filter(item => item.status === this.data.status);
      }

      // 合并并按创建时间倒序
      const allOrders = [...sellerOrders, ...buyerOrders].sort((a, b) => {
        const timeA = new Date(a.createTime || 0).getTime();
        const timeB = new Date(b.createTime || 0).getTime();
        return timeB - timeA;
      });

      // 分页截取
      const start = (this.data.page - 1) * this.data.pageSize;
      const pageOrders = allOrders.slice(start, start + this.data.pageSize);

      this.setData({
        orders: this.data.page === 1 ? pageOrders : [...this.data.orders, ...pageOrders],
        total: allOrders.length,
        hasMore: start + pageOrders.length < allOrders.length,
        loading: false
      });
    } catch (err) {
      console.error('加载订单失败:', err);
      this.setData({
        orders: [],
        loading: false
      });
    }
  },

  /**
   * 获取卖家订单
   */
  async fetchSellerOrders() {
    try {
      const data = await request.get(API.order.list, { page: 1, pageSize: 50 });
      if (data && data.list) {
        return (data.list || []).map(item => ({
          ...item,
          orderType: 'SELL',
          orderTypeText: '卖出',
          statusText: this.getSellerStatusText(item.status),
          statusColor: this.getSellerStatusColor(item.status),
          displayAmount: item.recycleAmount || '0.00',
          displayAmountLabel: '回收金额'
        }));
      }
      return [];
    } catch (err) {
      console.error('获取卖家订单失败:', err);
      return [];
    }
  },

  /**
   * 获取买家订单
   */
  async fetchBuyerOrders() {
    try {
      const data = await request.get(API.buy.orderList, { page: 1, pageSize: 50 });
      if (data && data.list) {
        return (data.list || []).map(item => ({
          ...item,
          id: `BUY_${item.buyOrderId}`, // 加前缀避免与卖家订单ID冲突
          buyOrderId: item.buyOrderId,   // 保留原始ID用于跳转
          orderType: 'BUY',
          orderTypeText: '买入',
          statusText: this.getBuyerStatusText(item.status),
          statusColor: this.getBuyerStatusColor(item.status),
          displayAmount: item.buyPrice || '0.00',
          displayAmountLabel: '购买价格'
        }));
      }
      return [];
    } catch (err) {
      console.error('获取买家订单失败:', err);
      return [];
    }
  },

  /**
   * 获取卖家状态文本
   */
  getSellerStatusText(status) {
    const map = {
      'PENDING': '待处理',
      'PROCESSING': '处理中',
      'SUCCESS': '已完成',
      'FAILED': '已失败',
      'CANCELLED': '已取消'
    };
    return map[status] || '未知';
  },

  /**
   * 获取卖家状态颜色
   */
  getSellerStatusColor(status) {
    const map = {
      'PENDING': '#FAAD14',
      'PROCESSING': '#1890FF',
      'SUCCESS': '#52C41A',
      'FAILED': '#F5222D',
      'CANCELLED': '#999'
    };
    return map[status] || '#999';
  },

  /**
   * 获取买家状态文本
   */
  getBuyerStatusText(status) {
    const map = {
      'PENDING': '待支付',
      'PAID': '已支付',
      'CANCELLED': '已取消'
    };
    return map[status] || '未知';
  },

  /**
   * 获取买家状态颜色
   */
  getBuyerStatusColor(status) {
    const map = {
      'PENDING': '#FAAD14',
      'PAID': '#52C41A',
      'CANCELLED': '#999'
    };
    return map[status] || '#999';
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ page: 1, orders: [] });
    this.loadOrders();
    wx.stopPullDownRefresh();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadOrders();
    }
  },

  /**
   * 点击订单
   */
  onOrderClick(e) {
    const { id, type } = e.currentTarget.dataset;

    if (type === 'BUY') {
      // id 格式为 BUY_xxx，提取原始 buyOrderId
      const buyOrderId = id.replace('BUY_', '');
      wx.navigateTo({
        url: `/pages/buy/order/detail/detail?buyOrderId=${buyOrderId}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/order/detail/detail?id=${id}`
      });
    }
  },

  /**
   * 去首页
   */
  onGoToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});