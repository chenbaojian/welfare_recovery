// pages/ecommerce/list/list.js
Page({
  data: {
    items: [
      { id: 'jdmarket', name: '京东超市卡', icon: '🛒', color: '#E1251B', discount: 0.97, description: '京东超市卡回收' },
      { id: 'yonghui', name: '永辉超市卡', icon: '🏪', color: '#00A0E9', discount: 0.97, description: '永辉超市卡回收' },
      { id: 'meituan', name: '美团礼品卡', icon: '🎁', color: '#FF6A00', discount: 0.97, description: '美团礼品卡回收' },
      { id: 'tmall', name: '天猫超市卡', icon: '🛍️', color: '#FF5000', discount: 0.97, description: '天猫超市卡回收' },
      { id: 'yintai', name: '银泰百货银泰卡', icon: '💳', color: '#8B4513', discount: 0.97, description: '银泰百货银泰卡回收' },
      { id: 'suning', name: '苏宁易购礼品卡', icon: '📦', color: '#FF0', discount: 0.97, description: '苏宁易购礼品卡回收' },
      { id: 'zhongbai', name: '中百超市购物卡', icon: '🛃', color: '#008000', discount: 0.97, description: '中百超市购物卡回收' }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '电商卡回收'
    });
  },

  /**
   * 选择卡券类型
   */
  onSelectItem(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/ecommerce/detail/detail?type=${id}&name=${encodeURIComponent(name)}`
    });
  }
});