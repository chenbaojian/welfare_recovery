// src/routes/user.js - 用户路由
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const userController = require('../controllers/user');
const { auth, verified } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * 手机号快捷登录（微信 getPhoneNumber 组件）
 * POST /api/user/phoneQuickLogin
 */
router.post('/phoneQuickLogin',
  [
    body('code').notEmpty().withMessage('code不能为空'),
    body('phoneCode').notEmpty().withMessage('phoneCode不能为空')
  ],
  validate,
  userController.phoneQuickLogin
);

/**
 * 检查手机号是否已注册
 * GET /api/user/checkPhone
 */
router.get('/checkPhone',
  [
    query('phone').notEmpty().withMessage('手机号不能为空')
      .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确')
  ],
  validate,
  userController.checkPhone
);

/**
 * 开发环境登录（仅开发环境可用）
 * POST /api/user/devLogin
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/devLogin', userController.devLogin);
}

/**
 * 微信登录
 * POST /api/user/wxLogin
 */
router.post('/wxLogin',
  [
    body('code').notEmpty().withMessage('code不能为空')
  ],
  validate,
  userController.wxLogin
);

/**
 * 手机号密码登录（用户不存在则自动注册）
 * POST /api/user/phonePasswordLogin
 */
router.post('/phonePasswordLogin',
  [
    body('phone').notEmpty().withMessage('手机号不能为空')
      .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
    body('password').notEmpty().withMessage('密码不能为空')
      .isLength({ min: 6 }).withMessage('密码至少6位')
  ],
  validate,
  userController.phonePasswordLogin
);

/**
 * 手机号验证码登录（用户不存在则自动注册，新用户可设置密码）
 * POST /api/user/phoneSmsLogin
 */
router.post('/phoneSmsLogin',
  [
    body('phone').notEmpty().withMessage('手机号不能为空')
      .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
    body('code').notEmpty().withMessage('验证码不能为空')
      .isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字'),
    body('password').optional().isLength({ min: 8, max: 16 }).withMessage('登录密码为8-16位')
  ],
  validate,
  userController.phoneSmsLogin
);

/**
 * 发送短信验证码
 * POST /api/user/sendSmsCode
 */
router.post('/sendSmsCode',
  [
    body('phone').notEmpty().withMessage('手机号不能为空')
      .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确')
  ],
  validate,
  userController.sendSmsCode
);

/**
 * 手机号登录（微信手机号按钮方式）
 * POST /api/user/phoneLogin
 */
router.post('/phoneLogin',
  [
    body('code').notEmpty().withMessage('code不能为空'),
    body('encryptedData').notEmpty().withMessage('encryptedData不能为空'),
    body('iv').notEmpty().withMessage('iv不能为空')
  ],
  validate,
  userController.phoneLoginOld
);

/**
 * 实名认证
 * POST /api/user/verify
 */
router.post('/verify',
  auth,
  [
    body('realName')
      .notEmpty().withMessage('姓名不能为空')
      .isLength({ min: 2, max: 20 }).withMessage('姓名长度应在2-20之间'),
    body('idCard')
      .notEmpty().withMessage('身份证号不能为空')
      .isLength({ min: 18, max: 18 }).withMessage('身份证号应为18位')
  ],
  validate,
  userController.verify
);

/**
 * 获取用户信息
 * GET /api/user/info
 */
router.get('/info', auth, userController.getInfo);

/**
 * 更新用户信息
 * PUT /api/user/update
 */
router.put('/update',
  auth,
  [
    body('nickname').optional().isLength({ max: 30 }),
    body('avatar').optional().isURL()
  ],
  validate,
  userController.updateInfo
);

/**
 * 退出登录
 * POST /api/user/logout
 */
router.post('/logout', auth, userController.logout);

module.exports = router;