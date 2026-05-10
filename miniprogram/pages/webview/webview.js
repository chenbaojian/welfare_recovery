// pages/webview/webview.js
Page({
  data: {
    url: '',
    title: '',
    loading: true
  },

  onLoad(options) {
    const { type, title } = options;
    
    // 设置标题
    if (title) {
      wx.setNavigationBarTitle({ title });
    }
    
    // 根据类型设置URL
    const urlMap = {
      user: 'https://www.example.com/user-agreement',
      privacy: 'https://www.example.com/privacy-policy',
      verify: 'https://www.example.com/verify-agreement',
      about: 'https://www.example.com/about',
      feedback: 'https://www.example.com/feedback',
      withdraw: 'https://www.example.com/withdraw-list'
    };
    
    this.setData({
      url: urlMap[type] || '',
      title: title || ''
    });
  },

  /**
   * 网页加载完成
   */
  onWebviewLoad() {
    this.setData({ loading: false });
  },

  /**
   * 网页加载失败
   */
  onWebviewError(e) {
    console.error('网页加载失败:', e);
    wx.showToast({
      title: '加载失败',
      icon: 'none'
    });
  },

  /**
   * 接收网页消息
   */
  onWebviewMessage(e) {
    console.log('收到网页消息:', e.detail);
  }
});