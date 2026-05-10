// pages/buy/detail/detail.js - 买家卡券详情/下单页
const request = require('../../../utils/request');
const { checkLogin } = require('../../../utils/auth');
const API = require('../../../config/api');
const { BUY_ORDER_STATUS, CARD_ICONS } = require('../../../config/constants');

Page({
  data: {
    recycleOrderId: 0,
    loading: true,

    // 卡券信息
    cardInfo: null,

    // 购买订单信息（下单后）
    buyOrder: null,
    buyOrderStatus: BUY_ORDER_STATUS,

    // 状态
    isPaying: false,
    countdown: '',  // 倒计时显示
    countdownTimer: null
  },

  onLoad(options) {
    const { recycleOrderId } = options;

    if (!recycleOrderId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ recycleOrderId: parseInt(recycleOrderId) });
    this.loadCardDetail();
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  /**
   * 加载卡券详情
   * 通过 cardList 接口查询该回收订单对应的可售卡券信息
   */
  async loadCardDetail() {
    this.setData({ loading: true });

    try {
      // 先获取可售卡券种类，找到该卡券所属类型
      const types = await request.get(API.buy.cardTypes);

      if (types && types.length > 0) {
        // 遍历类型查找该回收订单
        for (const type of types) {
          const data = await request.get(API.buy.cardList, {
            cardTypeId: type.cardTypeId,
            sortBy: 'price_asc',
            page: 1,
            pageSize: 100
          });

          if (data && data.list) {
            const card = data.list.find(item => item.recycleOrderId === this.data.recycleOrderId);
            if (card) {
              card.icon = CARD_ICONS[card.cardTypeId] || '🎫';
              // 预处理显示字段（WXML不支持.toFixed等JS方法）
              card.discountText = card.discountRate ? (card.discountRate * 10).toFixed(1) : '';
              card.saveAmount = (card.faceValue - card.buyPrice).toFixed(2);
              this.setData({
                cardInfo: card,
                loading: false
              });
              return;
            }
          }
        }
      }

      // 未找到该卡券
      this.setData({ loading: false });
    } catch (err) {
      console.error('加载卡券详情失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /**
   * 确认购买 - 创建购买订单
   */
  async onConfirmBuy() {
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

    wx.showModal({
      title: '确认购买',
      content: `确认以 ¥${this.data.cardInfo.buyPrice} 购买该卡券？`,
      success: async (res) => {
        if (res.confirm) {
          this.createBuyOrder();
        }
      }
    });
  },

  /**
   * 创建购买订单
   */
  async createBuyOrder() {
    try {
      const data = await request.post(API.buy.create, {
        recycleOrderId: this.data.recycleOrderId
      });

      if (data) {
        this.setData({
          buyOrder: {
            ...data,
            createTime: data.createTime || new Date().toISOString()
          }
        });

        this.startCountdown(data.createTime || new Date().toISOString());

        wx.showToast({ title: '订单创建成功', icon: 'success' });
      }
    } catch (err) {
      console.error('创建购买订单失败:', err);

      if (err.code === 40001) {
        wx.showModal({
          title: '购买失败',
          content: '该卡券已被其他用户购买，请选择其他卡券',
          showCancel: false,
          success: () => wx.navigateBack()
        });
      } else if (err.code === 40002) {
        wx.showToast({ title: '该卡券暂不可购买', icon: 'none' });
      } else {
        wx.showToast({ title: '购买失败，请重试', icon: 'none' });
      }
    }
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
        this.onCancelOrder();
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
   * 支付订单（模拟支付）
   */
  async onPayOrder() {
    if (this.data.isPaying) return;

    this.setData({ isPaying: true });

    try {
      const data = await request.post(API.buy.pay, {
        buyOrderId: this.data.buyOrder.buyOrderId || this.data.buyOrder.id
      });

      if (data) {
        if (this.data.countdownTimer) {
          clearInterval(this.data.countdownTimer);
        }

        this.setData({
          buyOrder: {
            ...this.data.buyOrder,
            status: 'PAID',
            cardNo: data.cardNo,
            cardPwd: data.cardPwd
          },
          countdown: '',
          isPaying: false
        });

        wx.showToast({ title: '支付成功', icon: 'success' });
      }
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
              buyOrderId: this.data.buyOrder.buyOrderId || this.data.buyOrder.id
            });

            if (this.data.countdownTimer) {
              clearInterval(this.data.countdownTimer);
            }

            this.setData({
              buyOrder: {
                ...this.data.buyOrder,
                status: 'CANCELLED'
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
   * 返回首页
   */
  onGoBack() {
    wx.navigateBack();
  },

  /**
   * 查看我的购买订单
   */
  onGoToBuyOrders() {
    wx.navigateTo({
      url: '/pages/buy/order/list/list'
    });
  }
});