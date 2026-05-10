// pages/order/detail/detail.js
const request = require('../../../utils/request');
const API = require('../../../config/api');

Page({
  data: {
    order: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadOrderDetail(id);
    }
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail(orderId) {
    try {
      const data = await request.get(API.order.detail, { id: orderId });

      if (data) {
        this.setData({
          order: {
            ...data,
            statusText: this.getStatusText(data.status),
            typeText: this.getTypeText(data.card_type_name || data.cardTypeName)
          },
          loading: false
        });

        wx.setNavigationBarTitle({
          title: '订单详情'
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: '订单不存在',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('加载订单详情失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'PENDING': '待处理',
      'PROCESSING': '处理中',
      'SUCCESS': '已完成',
      'FAILED': '已失败',
      'CANCELLED': '已取消'
    };
    return statusMap[status] || '未知';
  },

  /**
   * 获取类型文本
   */
  getTypeText(type) {
    return type || '卡券';
  },

  /**
   * 复制订单号
   */
  onCopyOrderId() {
    const { order } = this.data;
    if (!order) return;

    wx.setClipboardData({
      data: order.order_no || order.orderNo || order.id,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 联系客服（订单有问题时）
   */
  onContactService() {
    wx.navigateTo({
      url: '/pages/contact/contact'
    });
  }
});