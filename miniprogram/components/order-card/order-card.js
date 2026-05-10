// components/order-card/order-card.js
Component({
  properties: {
    order: {
      type: Object,
      value: {}
    },
    showAction: {
      type: Boolean,
      value: false
    }
  },

  data: {
    statusMap: {
      'PENDING': { text: '待处理', color: '#FAAD14', icon: 'clock' },
      'PROCESSING': { text: '处理中', color: '#1890FF', icon: 'replay' },
      'SUCCESS': { text: '已完成', color: '#52C41A', icon: 'passed' },
      'FAILED': { text: '已失败', color: '#F5222D', icon: 'cross' },
      'CANCELLED': { text: '已取消', color: '#999999', icon: 'close' }
    }
  },

  methods: {
    /**
     * 点击订单卡片
     */
    onTap() {
      const { id } = this.data.order;
      this.triggerEvent('click', { id });
      
      wx.navigateTo({
        url: `/pages/order/detail/detail?id=${id}`
      });
    },

    /**
     * 查看详情
     */
    onViewDetail() {
      const { id } = this.data.order;
      this.triggerEvent('detail', { id });
      
      wx.navigateTo({
        url: `/pages/order/detail/detail?id=${id}`
      });
    },

    /**
     * 取消订单
     */
    onCancel() {
      this.triggerEvent('cancel', { id: this.data.order.id });
    },

    /**
     * 重新提交
     */
    onResubmit() {
      this.triggerEvent('resubmit', { order: this.data.order });
    },

    /**
     * 复制订单号
     */
    onCopyOrderNo() {
      wx.setClipboardData({
        data: this.data.order.orderNo,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success'
          });
        }
      });
    }
  }
});
