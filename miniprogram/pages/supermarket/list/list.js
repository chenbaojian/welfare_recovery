// pages/supermarket/list/list.js
Page({
  data: {
    items: [
      { id: 'walmart', name: '沃尔玛卡', icon: '🏪', color: '#0071CE', discount: 0.92, description: '沃尔玛卡回收' },
      { id: 'hema', name: '盒马生鲜', icon: '🦐', color: '#FF6A00', discount: 0.92, description: '盒马生鲜回收' },
      { id: 'pupu', name: '朴朴超市', icon: '🛒', color: '#00C853', discount: 0.92, description: '朴朴超市回收' },
      { id: 'xiaoxiang', name: '小象超市', icon: '🐘', color: '#9C27B0', discount: 0.92, description: '小象超市回收' },
      { id: 'hongqi', name: '红旗连锁', icon: '🔴', color: '#D32F2F', discount: 0.92, description: '红旗连锁（邮寄）回收' }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '商超卡回收'
    });
  },

  /**
   * 选择卡券类型
   */
  onSelectItem(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/supermarket/detail/detail?type=${id}&name=${encodeURIComponent(name)}`
    });
  }
});