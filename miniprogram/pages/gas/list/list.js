// pages/gas/list/list.js
Page({
  data: {
    providers: [
      {
        id: 'sinopec',
        name: '中国石化',
        icon: '⛽',
        color: '#E60012',
        faceValues: [50, 100, 200, 500, 1000],
        discount: 0.95,
        description: '中石化加油卡'
      },
      {
        id: 'petrochina',
        name: '中国石油',
        icon: '⛽',
        color: '#F5A623',
        faceValues: [50, 100, 200, 500, 1000],
        discount: 0.94,
        description: '中石油加油卡'
      },
      {
        id: 'cnooc',
        name: '中国海油',
        icon: '⛽',
        color: '#00A0E9',
        faceValues: [50, 100, 200, 500, 1000],
        discount: 0.93,
        description: '中海油加油卡'
      }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '加油卡回收'
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
        url: `/pages/gas/detail/detail?providerId=${id}&name=${encodeURIComponent(provider.name)}&discount=${provider.discount}`
      });
    }
  }
});
