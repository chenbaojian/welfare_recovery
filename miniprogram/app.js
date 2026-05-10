// app.js - 小程序入口文件
App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    systemInfo: null
  },

  onLaunch() {
    // 获取系统信息
    this.globalData.systemInfo = wx.getSystemInfoSync();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 检查更新
    this.checkUpdate();
  },

  onShow() {
    // 小程序显示时的处理
  },

  onHide() {
    // 小程序隐藏时的处理
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = userInfo;
    } else {
      this.globalData.isLoggedIn = false;
      this.globalData.userInfo = null;
    }
  },

  /**
   * 检查小程序更新
   */
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('检测到新版本');
        }
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      
      updateManager.onUpdateFailed(() => {
        wx.showToast({
          title: '新版本下载失败',
          icon: 'none'
        });
      });
    }
  },

  /**
   * 全局登录方法
   */
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code);
          } else {
            reject(new Error('登录失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  /**
   * 更新用户信息
   */
  updateUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  }
});
