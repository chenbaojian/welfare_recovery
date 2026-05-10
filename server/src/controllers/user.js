// src/controllers/user.js - 用户控制器
const userService = require('../services/user');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * 检查手机号是否已注册
 * GET /api/user/checkPhone?phone=xxx
 */
exports.checkPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.json({
        code: 400,
        message: '手机号格式不正确'
      });
    }

    const user = await userService.findByPhone(phone);

    res.json({
      code: 200,
      data: {
        exists: !!user,
        isNewUser: !user
      }
    });
  } catch (err) {
    logger.error('检查手机号失败:', err);
    next(err);
  }
};

/**
 * 开发环境登录（仅开发环境可用，自动创建测试用户并返回token）
 */
exports.devLogin = async (req, res, next) => {
  try {
    // 查找或创建开发测试用户
    let user = await userService.findByOpenId('dev_test_openid');

    if (!user) {
      user = await userService.create({
        openId: 'dev_test_openid',
        nickname: '测试用户',
        phone: '13800138000',
        isVerified: true,
        verifyTime: new Date(),
        loginType: 'DEV'
      });
    }

    // 生成token
    const token = generateToken({ userId: user.id });

    res.json({
      code: 200,
      message: '开发环境登录成功',
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname || '测试用户',
          avatar: user.avatar || '',
          phone: user.phone || '13800138000',
          isVerified: user.isVerified || true
        }
      }
    });
  } catch (err) {
    logger.error('开发环境登录失败:', err);
    next(err);
  }
};

/**
 * 微信登录
 */
exports.wxLogin = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    // 获取微信openid和session_key
    const wxData = await userService.getWxSession(code);
    
    // 查找或创建用户
    let user = await userService.findByOpenId(wxData.openid);
    
    if (!user) {
      user = await userService.create({
        openId: wxData.openid,
        sessionKey: wxData.session_key,
        loginType: 'WECHAT'
      });
    } else {
      // 更新session_key
      await userService.update(user.id, { sessionKey: wxData.session_key });
    }
    
    // 生成token
    const token = generateToken({ userId: user.id });
    
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    logger.error('微信登录失败:', err);
    next(err);
  }
};

/**
 * 手机号密码登录（用户不存在则自动注册）
 */
exports.phonePasswordLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // 查找用户
    let user = await userService.findByPhone(phone);

    if (!user) {
      // 用户不存在，自动注册
      const hashedPassword = require('../utils/crypto').md5(password);
      user = await userService.create({
        phone,
        password: hashedPassword,
        nickname: '用户' + phone.slice(-4),
        loginType: 'PHONE_PASSWORD'
      });
    } else {
      // 用户存在，验证密码
      const hashedPassword = require('../utils/crypto').md5(password);
      if (user.password !== hashedPassword) {
        return res.json({
          code: 10005,
          message: '密码错误'
        });
      }
    }

    // 生成token
    const token = generateToken({ userId: user.id });

    res.json({
      code: 200,
      message: user.password ? '登录成功' : '注册并登录成功',
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    logger.error('手机号密码登录失败:', err);
    next(err);
  }
};

/**
 * 手机号验证码登录（用户不存在则自动注册，新用户可设置密码）
 */
exports.phoneSmsLogin = async (req, res, next) => {
  try {
    const { phone, code, password } = req.body;

    // 验证验证码
    const smsService = require('../services/sms');
    const isValid = await smsService.verifyCode(phone, code, 'login');
    if (!isValid) {
      return res.json({
        code: 10006,
        message: '验证码错误或已过期'
      });
    }

    // 查找或创建用户
    let user = await userService.findByPhone(phone);
    const isNewUser = !user;

    if (!user) {
      // 用户不存在，自动注册
      const userData = {
        phone,
        nickname: '用户' + phone.slice(-4),
        loginType: 'PHONE_SMS'
      };

      // 新用户可设置密码（8-16位）
      if (password) {
        if (password.length < 8 || password.length > 16) {
          return res.json({
            code: 400,
            message: '登录密码为8-16位'
          });
        }
        userData.password = require('../utils/crypto').md5(password);
      }

      user = await userService.create(userData);
    }

    // 生成token
    const token = generateToken({ userId: user.id });

    res.json({
      code: 200,
      message: isNewUser ? '注册并登录成功' : '登录成功',
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    logger.error('手机号验证码登录失败:', err);
    next(err);
  }
};

/**
 * 发送短信验证码
 */
exports.sendSmsCode = async (req, res, next) => {
  try {
    const { phone, type } = req.body;

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.json({
        code: 400,
        message: '手机号格式不正确'
      });
    }

    // 发送验证码
    const smsService = require('../services/sms');
    const result = await smsService.sendCode(phone, type || 'login');

    res.json({
      code: 200,
      message: '验证码已发送',
      data: result
    });
  } catch (err) {
    logger.error('发送验证码失败:', err);
    next(err);
  }
};

/**
 * 手机号登录（微信手机号按钮方式）
 */
exports.phoneLoginOld = async (req, res, next) => {
  try {
    const { code, encryptedData, iv } = req.body;
    
    // 获取微信session
    const wxData = await userService.getWxSession(code);
    
    // 解密手机号
    const phoneData = await userService.decryptPhone(
      encryptedData,
      iv,
      wxData.session_key
    );
    
    // 查找或创建用户
    let user = await userService.findByPhone(phoneData.phoneNumber);
    
    if (!user) {
      user = await userService.create({
        openId: wxData.openid,
        sessionKey: wxData.session_key,
        phone: phoneData.phoneNumber,
        loginType: 'PHONE'
      });
    } else {
      // 更新信息
      await userService.update(user.id, {
        openId: wxData.openid,
        sessionKey: wxData.session_key
      });
    }
    
    // 生成token
    const token = generateToken({ userId: user.id });
    
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    logger.error('手机号登录失败:', err);
    next(err);
  }
};

/**
 * 实名认证
 */
exports.verify = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { realName, idCard } = req.body;
    
    // 检查是否已认证
    const user = await userService.findById(userId);
    if (user.isVerified) {
      return res.json({
        code: 400,
        message: '您已完成实名认证'
      });
    }
    
    // 检查身份证是否已被使用
    const existUser = await userService.findByIdCard(idCard);
    if (existUser && existUser.id !== userId) {
      return res.json({
        code: 10004,
        message: '该身份证号已被其他账号使用'
      });
    }
    
    // 调用第三方实名认证接口
    const verifyResult = await userService.verifyRealName(realName, idCard);
    
    if (!verifyResult.success) {
      return res.json({
        code: 10003,
        message: '实名认证失败，请检查信息是否正确'
      });
    }
    
    // 更新用户信息
    await userService.update(userId, {
      realName,
      idCard,
      isVerified: true,
      verifyTime: new Date()
    });
    
    res.json({
      code: 200,
      message: '实名认证成功',
      data: {
        verifyTime: new Date()
      }
    });
  } catch (err) {
    logger.error('实名认证失败:', err);
    next(err);
  }
};

/**
 * 获取用户信息
 */
exports.getInfo = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    const user = await userService.getUserInfo(userId);
    
    res.json({
      code: 200,
      data: user
    });
  } catch (err) {
    logger.error('获取用户信息失败:', err);
    next(err);
  }
};

/**
 * 更新用户信息
 */
exports.updateInfo = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { nickname, avatar } = req.body;
    
    await userService.update(userId, { nickname, avatar });
    
    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (err) {
    logger.error('更新用户信息失败:', err);
    next(err);
  }
};

/**
 * 退出登录
 */
exports.logout = async (req, res, next) => {
  try {
    // 可以在这里处理token失效逻辑
    res.json({
      code: 200,
      message: '退出成功'
    });
  } catch (err) {
    logger.error('退出登录失败:', err);
    next(err);
  }
};