// config/constants.js - 常量定义

// 卡券类型图标映射 - 使用emoji或文字代替图片
const CARD_ICONS = {
  'phone': '📱',
  'gas': '⛽',
  'game': '🎮',
  'ecommerce': '🛒',
  'supermarket': '🏪',
  'travel': '🚗',
  'food': '🍔',
  'movie': '🎬',
  'music': '🎵',
  'meituan': '🎁',
  'laobao': '💼',
  'ctrip': '✈️',
  'jd': '📦',
  'default': '🎫'
};

// 卡券分类
const CARD_CATEGORIES = {
  'telecom': {
    name: '通信类',
    icon: 'phone'
  },
  'travel': {
    name: '出行类',
    icon: 'travel'
  },
  'entertainment': {
    name: '娱乐类',
    icon: 'game'
  },
  'ecommerce': {
    name: '电商类',
    icon: 'ecommerce'
  },
  'life': {
    name: '生活类',
    icon: 'food'
  },
  'points': {
    name: '积分类',
    icon: 'meituan'
  }
};

// 面值选项
const FACE_VALUES = [10, 20, 30, 50, 100, 200, 300, 500, 1000];

// 银行列表 - 使用文字代替图标
const BANK_LIST = [
  { code: 'ICBC', name: '工商银行', icon: '🏦' },
  { code: 'ABC', name: '农业银行', icon: '🏦' },
  { code: 'BOC', name: '中国银行', icon: '🏦' },
  { code: 'CCB', name: '建设银行', icon: '🏦' },
  { code: 'CMB', name: '招商银行', icon: '🏦' },
  { code: 'COMM', name: '交通银行', icon: '🏦' },
  { code: 'CITIC', name: '中信银行', icon: '🏦' },
  { code: 'CEB', name: '光大银行', icon: '🏦' },
  { code: 'SPDB', name: '浦发银行', icon: '🏦' },
  { code: 'GDB', name: '广发银行', icon: '🏦' },
  { code: 'PAB', name: '平安银行', icon: '🏦' },
  { code: 'CMBC', name: '民生银行', icon: '🏦' },
  { code: 'CIB', name: '兴业银行', icon: '🏦' },
  { code: 'PSBC', name: '邮储银行', icon: '🏦' }
];

// 错误码映射
const ERROR_CODE = {
  400: '请求参数错误',
  401: '未登录或登录已过期',
  403: '没有权限访问',
  404: '资源不存在',
  500: '服务器内部错误',
  10001: '用户不存在',
  10002: '用户已被禁用',
  10003: '实名认证失败',
  10004: '身份证号已被使用',
  10005: '密码错误',
  10006: '验证码错误或已过期',
  20001: '卡券类型不存在',
  20002: '卡券已禁用',
  20003: '面值不在支持范围内',
  30001: '订单不存在',
  30002: '订单状态异常',
  30003: '卡号或卡密错误',
  30004: '卡券已使用',
  30005: '卡券已过期',
  40001: '余额不足',
  40002: '提现金额不满足最低要求',
  40003: '结算账户未绑定',
  // 买家模式错误码
  50001: '该卡券已被其他用户购买',
  50002: '该卡券暂不可购买',
  50003: '购买订单不存在或状态异常',
  50004: '仅待支付订单可取消'
};

// 正则表达式
const REGEX = {
  phone: /^1[3-9]\d{9}$/,
  idCard: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  name: /^[\u4e00-\u9fa5]{2,20}$/,
  bankCard: /^\d{16,19}$/,
  number: /^\d+(\.\d{1,2})?$/
};

// 买家订单状态
const BUY_ORDER_STATUS = {
  PENDING: {
    value: 'PENDING',
    text: '待支付',
    color: '#FAAD14'
  },
  PAID: {
    value: 'PAID',
    text: '已支付',
    color: '#52C41A'
  },
  CANCELLED: {
    value: 'CANCELLED',
    text: '已取消',
    color: '#999999'
  }
};

// 用户模式
const USER_MODE = {
  SELLER: 'SELLER',
  BUYER: 'BUYER'
};

// 提示信息
const MESSAGE = {
  // 成功提示
  loginSuccess: '登录成功',
  verifySuccess: '实名认证成功',
  orderSuccess: '订单提交成功',
  withdrawSuccess: '提现申请成功',
  
  // 错误提示
  networkError: '网络异常，请检查网络后重试',
  loginExpired: '登录已过期，请重新登录',
  verifyRequired: '请先完成实名认证',
  phoneInvalid: '请输入正确的手机号',
  idCardInvalid: '请输入正确的身份证号',
  nameInvalid: '请输入2-20个中文字符',
  bankCardInvalid: '请输入正确的银行卡号',
  amountInvalid: '请输入正确的金额',
  
  // 确认提示
  confirmSubmit: '确认提交订单？',
  confirmCancel: '确认取消订单？',
  confirmWithdraw: '确认申请提现？',
  confirmDelete: '确认删除？'
};

module.exports = {
  CARD_ICONS,
  CARD_CATEGORIES,
  FACE_VALUES,
  BANK_LIST,
  ERROR_CODE,
  REGEX,
  MESSAGE,
  BUY_ORDER_STATUS,
  USER_MODE
};
