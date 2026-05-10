// pages/buy/order/list/list.js - 买家订单列表页
const request = require('../../../utils/request');
const { checkLogin } = require('../../../utils/auth');
const API = require('../../../config/api');
const { BUY_ORDER_STATUS } = require('../../../config/constants');

Page({
  data: {
    tabs: [
      { name: '全部', value: '' },
      { name: '待支付', value: 'PENDING' },
      { name: '已支付', value: 'PAID' },
      { name: '已取消', value: 'CANCELLED' }
    ],
    activeTab: 0,
    status: '',
    orders: [],
    loading: false,
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,

    // 状态映射
    buyOrderStatus: BUY_ORDER_STATUS
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 每次显示刷新
    this.setData({ page: 1, orders: [] });
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
   * 加载订单列表
   */
  async loadOrders() {
    this.setData({ loading: true });

    try {
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize
      };
      if (this.data.status) {
        params.status = this.data.status;
      }

      const data = await request.get(API.buy.orderList, params);

      if (data) {
        const orders = (data.list || []).map(item => ({
          ...item,
          statusText: this.getStatusText(item.status),
          statusColor: this.getStatusColor(item.status)
        }));

        this.setData({
          orders: this.data.page === 1 ? orders : [...this.data.orders, ...orders],
          total: data.total || 0,
          hasMore: orders.length >= this.data.pageSize,
          loading: false
        });
      } else {
        this.setData({
          orders: [],
          total: 0,
          hasMore: false,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载买家订单失败:', err);
      this.setData({
        orders: [],
        loading: false
      });
    }
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const map = {
      'PENDING': '待支付',
      'PAID': '已支付',
      'CANCELLED': '已取消'
    };
    return map[status] || '未知';
  },

  /**
   * 获取状态颜色
   */
  getStatusColor(status) {
    const map = {
      'PENDING': '#FAAD14',
      'PAID': '#52C41A',
      'CANCELLED': '#999999'
    };
    return map[status] || '#999';
  },

  /**
   * 点击订单
   */
  onOrderClick(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/buy/order/detail/detail?buyOrderId=${id}`
    });
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
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ page: 1, orders: [] });
    this.loadOrders();
    wx.stopPullDownRefresh();
  },

  /**
   * 去购买
   */
  onGoToBuy() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});