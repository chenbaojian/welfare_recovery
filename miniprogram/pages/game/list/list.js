// pages/game/list/list.js
Page({
  data: {
    items: [
      {
        id: 'netease',
        name: '网易一卡通',
        icon: '🎮',
        color: '#E60012',
        discount: 0.90,
        description: '网易一卡通回收'
      }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '游戏卡回收'
    });
  },

  /**
   * 选择卡券类型
   */
  onSelectItem(e) {
    const { id } = e.currentTarget.dataset;
    
    if (id === 'netease') {
      wx.navigateTo({
        url: '/pages/game/detail/detail'
      });
    }
  }
});