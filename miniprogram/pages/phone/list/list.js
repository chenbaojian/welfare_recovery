// pages/phone/list/list.js
Page({
  data: {
    providers: [
      {
        id: 'mobile',
        name: '中国移动',
        icon: '📱',
        color: '#0066CC',
        faceValues: [20, 30, 50, 100],
        discount: 0.98,
        description: '全国移动充值卡'
      },
      {
        id: 'unicom',
        name: '中国联通',
        icon: '📱',
        color: '#E60012',
        faceValues: [20, 30, 50, 100],
        discount: 0.97,
        description: '全国联通充值卡'
      },
      {
        id: 'telecom',
        name: '中国电信',
        icon: '📱',
        color: '#00A0E9',
        faceValues: [20, 30, 50, 100],
        discount: 0.96,
        description: '全国电信充值卡'
      }
    ]
  },

  onLoad(options) {
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '电话卡回收'
    });
  },

  /**
   * 选择运营商
   */
  onSelectProvider(e) {
    const { id } = e.currentTarget.dataset;
    const provider = this.data.providers.find(p => p.id === id);
    
    if (provider) {
      wx.navigateTo({
        url: `/pages/phone/detail/detail?providerId=${id}&name=${encodeURIComponent(provider.name)}&discount=${provider.discount}`
      });
    }
  }
});
