// pages/travel/list/list.js
Page({
  data: {
    items: [
      {
        id: 'rsctrip',
        name: '融晟携程卡包',
        icon: '🎫',
        color: '#FF6B6B',
        discount: 0.72,
        description: '融晟携程卡包回收'
      },
      {
        id: 'ctrip',
        name: '携程积分',
        icon: '✈️',
        color: '#00A0E9',
        discount: 0.72,
        description: '携程旅行积分回收'
      }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '出行券回收'
    });
  },

  /**
   * 选择卡券类型
   */
  onSelectItem(e) {
    const { id } = e.currentTarget.dataset;
    
    if (id === 'rsctrip') {
      wx.navigateTo({
        url: '/pages/rsctrip/detail/detail'
      });
    } else if (id === 'ctrip') {
      wx.navigateTo({
        url: '/pages/ctrip/detail/detail'
      });
    }
  }
});