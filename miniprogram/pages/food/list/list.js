// pages/food/list/list.js
Page({
  data: {
    items: [
      { id: 'luckin', name: '瑞幸咖啡', icon: '☕', color: '#0066CC', discount: 0.88, description: '瑞幸咖啡回收' },
      { id: 'kfc', name: '肯德基', icon: '🍗', color: '#D32F2F', discount: 0.88, description: '肯德基回收' },
      { id: 'aidale', name: '爱达乐', icon: '🥐', color: '#FF9800', discount: 0.88, description: '爱达乐回收' },
      { id: 'holiland', name: '好利来', icon: '🎂', color: '#E91E63', discount: 0.88, description: '好利来回收' },
      { id: 'chagee', name: '霸王茶姬', icon: '🧋', color: '#4CAF50', discount: 0.88, description: '霸王茶姬回收' },
      { id: 'weiduomei', name: '味多美', icon: '🥮', color: '#9C27B0', discount: 0.88, description: '味多美回收' },
      { id: 'ganso', name: '元祖食品', icon: '🍰', color: '#FF5722', discount: 0.88, description: '元祖食品回收' },
      { id: 'starbucks', name: '星巴克', icon: '☕', color: '#00704A', discount: 0.88, description: '星巴克回收' }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '美食券回收'
    });
  },

  /**
   * 选择卡券类型
   */
  onSelectItem(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/food/detail/detail?type=${id}&name=${encodeURIComponent(name)}`
    });
  }
});