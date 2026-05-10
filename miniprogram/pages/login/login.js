// pages/login/login.js
import request from '../../utils/request';
import { wxLogin, setLoginInfo } from '../../utils/auth';
import API, { LOCAL_DEV } from '../../config/api';
import { MESSAGE } from '../../config/constants';
import { mockApi } from '../../utils/mock';

Page({
  data: {
    loading: false,
    sendingCode: false,
    agreed: false,
    redirectUrl: '',

    // 登录方式：wx-微信登录, phone-手机号登录
    loginMode: 'wx',

    // 手机号登录表单
    phone: '',
    password: '',
    code: '',
    // 手机号登录子方式：password-密码登录, sms-验证码登录
    phoneLoginType: 'password',

    // 新用户设置密码
    isNewUser: false,
    setPassword: '',
    setPasswordError: '',

    // 验证码倒计时
    countdown: 0,
    countdownTimer: null,

    // 开发调试：显示的验证码
    debugCode: '',

    // 表单错误
    phoneError: '',
    passwordError: '',
    codeError: ''
  },

  onLoad(options) {
    // 获取跳转地址
    if (options.redirect) {
      this.setData({
        redirectUrl: decodeURIComponent(options.redirect)
      });
    }
  },

  onUnload() {
    // 清除倒计时
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  /**
   * 切换登录方式
   */
  onSwitchMode(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      loginMode: mode,
      phoneError: '',
      passwordError: '',
      codeError: ''
    });
  },

  /**
   * 切换手机号登录方式
   */
  onSwitchPhoneLoginType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({
      phoneLoginType: type,
      passwordError: '',
      codeError: '',
      isNewUser: false,
      setPassword: '',
      setPasswordError: ''
    });
  },

  /**
   * 输入手机号
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value,
      phoneError: ''
    });
  },

  /**
   * 输入密码
   */
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      passwordError: ''
    });
  },

  /**
   * 输入验证码
   */
  onCodeInput(e) {
    this.setData({
      code: e.detail.value,
      codeError: ''
    });
  },

  /**
   * 输入设置密码（新用户）
   */
  onSetPasswordInput(e) {
    this.setData({
      setPassword: e.detail.value,
      setPasswordError: ''
    });
  },

  /**
   * 验证设置密码格式（8-16位，含字母和数字）
   */
  validateSetPassword(password) {
    if (!password) {
      return '请设置登录密码';
    }
    if (password.length < 8 || password.length > 16) {
      return '登录密码为8-16位';
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return '密码需包含字母和数字';
    }
    return '';
  },

  /**
   * 验证手机号格式
   */
  validatePhone(phone) {
    if (!phone) {
      return '请输入手机号';
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return '手机号格式不正确';
    }
    return '';
  },

  /**
   * 发送验证码
   */
  async onSendCode() {
    // 检查协议
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    // 验证手机号
    const phoneError = this.validatePhone(this.data.phone);
    if (phoneError) {
      this.setData({ phoneError });
      return;
    }

    // 检查是否正在倒计时
    if (this.data.countdown > 0) {
      return;
    }

    try {
      this.setData({ sendingCode: true });

      // 检查手机号是否已注册（判断是否新用户）
      if (!LOCAL_DEV) {
        try {
          const checkResult = await request.get(API.user.checkPhone + '?phone=' + this.data.phone);
          if (checkResult) {
            this.setData({ isNewUser: checkResult.isNewUser });
          }
        } catch (checkErr) {
          // 检查失败不阻塞发送验证码，默认不显示密码框
          console.log('[登录] 检查手机号失败:', checkErr.message);
        }
      }

      // 生成6位随机验证码（开发调试模式）
      const debugCode = Math.random().toString().slice(-6);

      // 本地开发模式
      if (LOCAL_DEV) {
        this.startCountdown();
        this.setData({ debugCode, isNewUser: true });
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
        return;
      }

      // 调用发送验证码接口
      const result = await request.post(API.user.sendSmsCode, {
        phone: this.data.phone,
        type: 'login'
      });

      this.startCountdown();

      // 开发环境：后端返回验证码，保存到debugCode供调试显示
      if (result && result.code) {
        this.setData({ debugCode: result.code });
      }

      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '发送失败',
        icon: 'none'
      });
    } finally {
      this.setData({ sendingCode: false });
    }
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    let countdown = 60;
    this.setData({ countdown });

    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          countdown: 0,
          countdownTimer: null
        });
      } else {
        this.setData({ countdown });
      }
    }, 1000);

    this.setData({ countdownTimer: timer });
  },

  /**
   * 微信一键登录
   */
  async onWxLogin() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    try {
      // 防止重复提交
      if (this.data.loading) return;
      this.setData({ loading: true });

      // 本地开发模式：使用模拟数据
      if (LOCAL_DEV) {
        const data = mockApi.wxLogin('mock_code');
        setLoginInfo(data.token, data.userInfo);

        wx.showToast({
          title: MESSAGE.loginSuccess,
          icon: 'success'
        });

        setTimeout(() => {
          this.handleLoginSuccess(data.userInfo);
        }, 1500);
        return;
      }

      // 开发环境：使用devLogin接口（无需真实WX_SECRET）
      if (API.user.devLogin) {
        try {
          const data = await request.post(API.user.devLogin);
          setLoginInfo(data.token, data.userInfo);
          wx.showToast({ title: MESSAGE.loginSuccess, icon: 'success' });
          setTimeout(() => { this.handleLoginSuccess(data.userInfo); }, 1500);
          return;
        } catch (devErr) {
          // devLogin失败，继续尝试正常微信登录
        }
      }

      // 获取登录code
      const code = await wxLogin();

      // 调用后端登录接口
      const data = await request.post(API.user.wxLogin, { code });

      // 存储登录信息
      setLoginInfo(data.token, data.userInfo);

      wx.showToast({
        title: MESSAGE.loginSuccess,
        icon: 'success'
      });

      // 检查实名状态并跳转
      setTimeout(() => {
        this.handleLoginSuccess(data.userInfo);
      }, 1500);
    } catch (err) {
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 手机号密码登录
   */
  async onPhonePasswordLogin() {
    // 检查协议
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    // 验证表单
    const phoneError = this.validatePhone(this.data.phone);
    if (phoneError) {
      this.setData({ phoneError });
      return;
    }

    if (!this.data.password) {
      this.setData({ passwordError: '请输入密码' });
      return;
    }

    if (this.data.password.length < 6) {
      this.setData({ passwordError: '密码至少6位' });
      return;
    }

    try {
      // 防止重复提交
      if (this.data.loading) return;
      this.setData({ loading: true });

      // 本地开发模式
      if (LOCAL_DEV) {
        const data = mockApi.phoneLogin(this.data.phone);
        setLoginInfo(data.token, data.userInfo);

        wx.showToast({
          title: MESSAGE.loginSuccess,
          icon: 'success'
        });

        setTimeout(() => {
          this.handleLoginSuccess(data.userInfo);
        }, 1500);
        return;
      }

      // 调用后端登录接口
      const data = await request.post(API.user.phonePasswordLogin, {
        phone: this.data.phone,
        password: this.data.password
      });

      // 存储登录信息
      setLoginInfo(data.token, data.userInfo);

      wx.showToast({
        title: MESSAGE.loginSuccess,
        icon: 'success'
      });

      setTimeout(() => {
        this.handleLoginSuccess(data.userInfo);
      }, 1500);
    } catch (err) {
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 手机号验证码登录（用户不存在时自动注册）
   */
  async onPhoneSmsLogin() {
    // 检查协议
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    // 验证表单
    const phoneError = this.validatePhone(this.data.phone);
    if (phoneError) {
      this.setData({ phoneError });
      return;
    }

    if (!this.data.code) {
      this.setData({ codeError: '请输入验证码' });
      return;
    }

    if (this.data.code.length !== 6) {
      this.setData({ codeError: '验证码为6位数字' });
      return;
    }

    // 新用户验证设置密码
    if (this.data.isNewUser) {
      const setPasswordError = this.validateSetPassword(this.data.setPassword);
      if (setPasswordError) {
        this.setData({ setPasswordError });
        return;
      }
    }

    try {
      // 防止重复提交
      if (this.data.loading) return;
      this.setData({ loading: true });

      // 构建请求参数
      const params = {
        phone: this.data.phone,
        code: this.data.code
      };

      // 新用户传入设置的密码
      if (this.data.isNewUser && this.data.setPassword) {
        params.password = this.data.setPassword;
      }

      // 本地开发模式
      if (LOCAL_DEV) {
        const data = mockApi.phoneLogin(this.data.phone);
        setLoginInfo(data.token, data.userInfo);

        wx.showToast({
          title: MESSAGE.loginSuccess,
          icon: 'success'
        });

        setTimeout(() => {
          this.handleLoginSuccess(data.userInfo);
        }, 1500);
        return;
      }

      // 调用后端登录接口
      console.log('[登录] 发送验证码登录请求, phone:', this.data.phone, 'code:', this.data.code, 'isNewUser:', this.data.isNewUser);
      const data = await request.post(API.user.phoneSmsLogin, params);
      console.log('[登录] 登录成功, data:', JSON.stringify(data));

      // 存储登录信息
      setLoginInfo(data.token, data.userInfo);

      wx.showToast({
        title: MESSAGE.loginSuccess,
        icon: 'success'
      });

      setTimeout(() => {
        this.handleLoginSuccess(data.userInfo);
      }, 1500);
    } catch (err) {
      console.log('[登录] 登录失败, err:', err.message);
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      });
    } finally {
      console.log('[登录] finally, 设置loading=false');
      this.setData({ loading: false });
    }
  },

  /**
   * 注册（手机号+验证码）
   */
  async onRegister() {
    // 验证表单
    const phoneError = this.validatePhone(this.data.phone);
    if (phoneError) {
      this.setData({ phoneError });
      return;
    }

    if (!this.data.code) {
      this.setData({ codeError: '请输入验证码' });
      return;
    }

    try {
      // 防止重复提交
      if (this.data.loading) return;
      this.setData({ loading: true });

      // 本地开发模式
      if (LOCAL_DEV) {
        const data = mockApi.phoneLogin(this.data.phone);
        setLoginInfo(data.token, data.userInfo);

        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });

        setTimeout(() => {
          this.handleLoginSuccess(data.userInfo);
        }, 1500);
        return;
      }

      // 调用注册接口
      const data = await request.post(API.user.register, {
        phone: this.data.phone,
        code: this.data.code
      });

      // 存储登录信息
      setLoginInfo(data.token, data.userInfo);

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });

      setTimeout(() => {
        this.handleLoginSuccess(data.userInfo);
      }, 1500);
    } catch (err) {
      wx.showToast({
        title: err.message || '注册失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 提交手机号登录
   */
  onSubmitPhoneLogin() {
    if (this.data.phoneLoginType === 'password') {
      this.onPhonePasswordLogin();
    } else {
      this.onPhoneSmsLogin();
    }
  },

  /**
   * 处理登录成功
   */
  handleLoginSuccess(userInfo) {
    console.log('[登录] handleLoginSuccess, userInfo:', JSON.stringify(userInfo), 'isVerified:', userInfo.isVerified);
    // 跳转到目标页面
    if (this.data.redirectUrl) {
      wx.redirectTo({
        url: this.data.redirectUrl
      });
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 同意协议
   */
  onAgreeChange(e) {
    this.setData({
      agreed: e.detail
    });
  },

  /**
   * 查看用户协议
   */
  onViewUserProtocol() {
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
   * 返回首页（游客模式）
   */
  onBackToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
