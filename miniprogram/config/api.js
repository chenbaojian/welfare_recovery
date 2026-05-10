// config/api.js - API接口地址配置

// 本地开发模式开关（true=使用模拟数据，false=调用真实后端）
const LOCAL_DEV = false;

const API_BASE = '';

const API = {
  // 用户模块
  user: {
    devLogin: `${API_BASE}/user/devLogin`,              // 开发环境登录（仅开发环境可用）
    wxLogin: `${API_BASE}/user/wxLogin`,               // 微信一键登录
    phonePasswordLogin: `${API_BASE}/user/phonePasswordLogin`, // 手机号密码登录
    phoneSmsLogin: `${API_BASE}/user/phoneSmsLogin`,   // 手机号验证码登录
    sendSmsCode: `${API_BASE}/user/sendSmsCode`,       // 发送验证码
    checkPhone: `${API_BASE}/user/checkPhone`,         // 检查手机号是否已注册
    register: `${API_BASE}/user/register`,             // 注册（手机号+验证码）
    verify: `${API_BASE}/user/verify`,                 // 实名认证
    getInfo: `${API_BASE}/user/info`,                  // 获取用户信息
    updateInfo: `${API_BASE}/user/update`,             // 更新用户信息
    logout: `${API_BASE}/user/logout`                  // 退出登录
  },

  // 卡券模块
  card: {
    typeList: `${API_BASE}/card/typeList`,         // 卡券类型列表
    detail: `${API_BASE}/card/detail`,             // 卡券详情
    calculate: `${API_BASE}/card/calculate`        // 计算回收金额
  },

  // 订单模块
  order: {
    create: `${API_BASE}/order/create`,            // 创建订单
    list: `${API_BASE}/order/list`,                // 订单列表
    detail: `${API_BASE}/order/detail`,            // 订单详情
    cancel: `${API_BASE}/order/cancel`             // 取消订单
  },

  // 提现模块
  withdraw: {
    create: `${API_BASE}/withdraw/create`,         // 创建提现
    list: `${API_BASE}/withdraw/list`,             // 提现列表
    detail: `${API_BASE}/withdraw/detail`          // 提现详情
  },

  // 结算账户模块
  bank: {
    list: `${API_BASE}/bank/list`,                 // 账户列表
    add: `${API_BASE}/bank/add`,                   // 添加账户
    update: `${API_BASE}/bank/update`,             // 更新账户
    delete: `${API_BASE}/bank/delete`,             // 删除账户
    setDefault: `${API_BASE}/bank/setDefault`      // 设置默认账户
  },

  // 买家模块
  buy: {
    cardTypes: `${API_BASE}/buy/cardTypes`,           // 可售卡券种类列表
    cardList: `${API_BASE}/buy/cardList`,             // 某类型可售卡券列表
    create: `${API_BASE}/buy/create`,                 // 创建购买订单
    pay: `${API_BASE}/buy/pay`,                       // 支付购买订单
    cancel: `${API_BASE}/buy/cancel`,                 // 取消购买订单
    orderList: `${API_BASE}/buy/orderList`,           // 买家订单列表
    orderDetail: `${API_BASE}/buy/orderDetail`,       // 买家订单详情
    orderStats: `${API_BASE}/buy/orderStats`          // 买家订单统计
  },

  // 公共模块
  common: {
    upload: `${API_BASE}/common/upload`,           // 文件上传
    config: `${API_BASE}/common/config`,           // 获取配置
    feedback: `${API_BASE}/common/feedback`,        // 意见反馈
    feedbackList: `${API_BASE}/common/feedback/list` // 反馈记录列表
  }
};

module.exports = API;
module.exports.LOCAL_DEV = LOCAL_DEV;
