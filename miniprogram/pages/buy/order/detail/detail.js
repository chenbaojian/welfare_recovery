// pages/buy/order/detail/detail.js - 买家订单详情页
const request = require('../../../utils/request');
const { checkLogin } = require('../../../utils/auth');
const API = require('../../../config/api');
const { BUY_ORDER_STATUS } = require('../../../config/constants');

Page({
  data: {
    buyOrderId: 0,
    loading: true,

    // 订单信息
    order: null,
    buyOrderStatus: BUY_ORDER_STATUS,

    // 状态
    isPaying: false,
    countdown: '',
    countdownTimer: null
  },

  onLoad(options) {
    const { buyOrderId } = options;

    if (!buyOrderId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ buyOrderId: parseInt(buyOrderId) });
    this.loadOrderDetail();
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    this.setData({ loading: true });

    try {
      const data = await request.get(API.buy.orderDetail, {
        buyOrderId: this.data.buyOrderId
      });

      if (data) {
        // 处理状态文本
        data.statusText = this.getStatusText(data.status);
        data.statusColor = this.getStatusColor(data.status);
        // 预处理折扣显示文本（WXML不支持.toFixed）
        data.discountText = data.discountRate ? (data.discountRate * 10).toFixed(1) : '';

        this.setData({
          order: data,
          loading: false
        });

        // 如果是待支付状态，启动倒计时
        if (data.status === 'PENDING' && data.createTime) {
          this.startCountdown(data.createTime);
        }
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '订单不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      console.error('加载订单详情失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
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
   * 启动倒计时
   */
  startCountdown(createTime) {
    const timeout = 30 * 60 * 1000;
    const createTimeMs = new Date(createTime).getTime();
    const endTime = createTimeMs + timeout;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearInterval(timer);
        this.setData({ countdown: '已超时' });
        // 刷新订单状态
        this.loadOrderDetail();
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      this.setData({
        countdown: `${minutes}分${seconds}秒`
      });
    }, 1000);

    this.setData({ countdownTimer: timer });
  },

  /**
   * 支付订单
   */
  onPayOrder() {
    if (this.data.isPaying) return;

    wx.showModal({
      title: '确认支付',
      content: `确认支付 ¥${this.data.order.buyPrice}？`,
      success: async (res) => {
        if (res.confirm) {
          this.doPayOrder();
        }
      }
    });
  },

  /**
   * 执行支付
   */
  async doPayOrder() {
    this.setData({ isPaying: true });

    try {
      const data = await request.post(API.buy.pay, {
        buyOrderId: this.data.buyOrderId
      });

      // 清除倒计时
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer);
      }

      this.setData({
        order: {
          ...this.data.order,
          status: 'PAID',
          statusText: '已支付',
          statusColor: '#52C41A',
          cardNo: data.cardNo,
          cardPwd: data.cardPwd
        },
        countdown: '',
        isPaying: false
      });

      wx.showToast({ title: '支付成功', icon: 'success' });
    } catch (err) {
      console.error('支付失败:', err);
      this.setData({ isPaying: false });

      if (err.code === 30001) {
        wx.showToast({ title: '订单不存在或状态异常', icon: 'none' });
      } else {
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      }
    }
  },

  /**
   * 取消订单
   */
  onCancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确认取消该购买订单？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request.post(API.buy.cancel, {
              buyOrderId: this.data.buyOrderId
            });

            // 清除倒计时
            if (this.data.countdownTimer) {
              clearInterval(this.data.countdownTimer);
            }

            this.setData({
              order: {
                ...this.data.order,
                status: 'CANCELLED',
                statusText: '已取消',
                statusColor: '#999999'
              },
              countdown: ''
            });

            wx.showToast({ title: '订单已取消', icon: 'success' });
          } catch (err) {
            console.error('取消订单失败:', err);
            wx.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 复制文本
   */
  onCopyText(e) {
    const { text } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  /**
   * 返回订单列表
   */
  onGoBack() {
    wx.navigateBack();
  },

  /**
   * 返回首页
   */
  onGoHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});