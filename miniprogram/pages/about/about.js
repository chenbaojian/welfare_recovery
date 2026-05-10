// pages/about/about.js
import Toast from '@vant/weapp/dist/toast/toast';

// 关于我们配置数据
const ABOUT_CONFIG = {
  appName: '福利回收',
  appDescription: '闲置卡券一键变现',
  appVersion: '1.0.0',
  updateDate: '2024-01-01',
  introduction: '福利回收是一款专业的卡券回收服务平台，致力于为用户提供安全、便捷、高效的卡券回收体验。我们支持电话卡、加油卡、游戏卡、电商卡、商超卡等多种卡券类型的回收，让您的闲置卡券快速变现，资金及时到账。',
  advantages: [
    { icon: '🔒', title: '安全保障', desc: '实名认证+数据加密' },
    { icon: '⚡', title: '高效回收', desc: '1-30分钟极速处理' },
    { icon: '💰', title: '实惠折扣', desc: '行业领先回收价格' }
  ],
  contactInfo: {
    phone: '15125357050',
    wechat: '15125357050',
    email: '2545415252@qq.com'
  },
  copyright: '© 2024 福利回收 版权所有'
};

Page({
  data: {
    appName: ABOUT_CONFIG.appName,
    appDescription: ABOUT_CONFIG.appDescription,
    appVersion: ABOUT_CONFIG.appVersion,
    updateDate: ABOUT_CONFIG.updateDate,
    introduction: ABOUT_CONFIG.introduction,
    advantages: ABOUT_CONFIG.advantages,
    contactInfo: ABOUT_CONFIG.contactInfo,
    copyright: ABOUT_CONFIG.copyright
  },

  onLoad() {
    // 页面加载
  },

  /**
   * 查看用户协议
   */
  onViewUserAgreement() {
    wx.navigateTo({
      url: '/pages/webview/webview?type=user&title=用户协议'
    });
  },

  /**
   * 查看隐私政策
   */
  onViewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/webview/webview?type=privacy&title=隐私政策'
    });
  },

  /**
   * 拨打客服热线
   */
  onCallPhone() {
    wx.makePhoneCall({
      phoneNumber: ABOUT_CONFIG.contactInfo.phone,
      fail: () => {
        Toast('拨打电话失败');
      }
    });
  },

  /**
   * 复制微信客服号
   */
  onCopyWechat() {
    wx.setClipboardData({
      data: ABOUT_CONFIG.contactInfo.wechat,
      success: () => {
        Toast('微信号已复制');
      }
    });
  },

  /**
   * 复制邮箱地址
   */
  onCopyEmail() {
    wx.setClipboardData({
      data: ABOUT_CONFIG.contactInfo.email,
      success: () => {
        Toast('邮箱地址已复制');
      }
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '福利回收 - 闲置卡券一键变现',
      path: '/pages/index/index'
    };
  }
});