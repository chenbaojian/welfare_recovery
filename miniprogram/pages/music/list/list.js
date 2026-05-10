// pages/music/list/list.js
Page({
  data: {
    items: [
      { id: 'iqiyi', name: '爱奇艺会员', icon: '📺', color: '#00BE06', discount: 0.80, description: '爱奇艺会员回收' },
      { id: 'tencent', name: '腾讯视频会员', icon: '🎬', color: '#FF6A00', discount: 0.80, description: '腾讯视频会员回收' },
      { id: 'youku', name: '优酷视频会员', icon: '🎥', color: '#1A9FE2', discount: 0.80, description: '优酷视频会员回收' },
      { id: 'mgtv', name: '芒果TV会员', icon: '📱', color: '#FF7E00', discount: 0.80, description: '芒果TV会员回收' },
      { id: 'jdmovie', name: '京东电影', icon: '🎞️', color: '#E1251B', discount: 0.80, description: '京东电影回收' },
      { id: 'ximalaya', name: '喜马拉雅FM', icon: '📻', color: '#F26B5A', discount: 0.80, description: '喜马拉雅FM回收' }
    ]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '影音券回收'
    });
  },

  /**
   * 选择卡券类型
   */
  onSelectItem(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/music/detail/detail?type=${id}&name=${encodeURIComponent(name)}`
    });
  }
});