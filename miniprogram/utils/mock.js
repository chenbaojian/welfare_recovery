// utils/mock.js - 本地开发模拟数据

// 模拟用户信息
const mockUserInfo = {
  id: '10001',
  nickname: '测试用户',
  avatar: '',
  phone: '13800138000',
  isVerified: true, // 已实名认证
  realName: '张三',
  idCard: '110101199001011234',
  balance: 1256.50,
  createTime: '2024-01-01 10:00:00'
};

// 模拟Token
const mockToken = 'mock_token_' + Date.now();

// 模拟卡券类型
const mockCardTypes = [
  {
    id: 'phone_100',
    name: '中国移动充值卡',
    icon: '📱',
    category: 'telecom',
    description: '支持全国移动充值卡回收',
    discount: 0.97,
    notice: '请确保卡券有效且未使用，提交后无法撤销',
    faceValues: [10, 20, 30, 50, 100, 200, 300, 500],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'phone_200',
    name: '中国联通充值卡',
    icon: '📱',
    category: 'telecom',
    description: '支持全国联通充值卡回收',
    discount: 0.96,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100, 200, 300, 500],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'phone_300',
    name: '中国电信充值卡',
    icon: '📱',
    category: 'telecom',
    description: '支持全国电信充值卡回收',
    discount: 0.96,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100, 200, 300, 500],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'gas_100',
    name: '中石化加油卡',
    icon: '⛽',
    category: 'travel',
    description: '支持中石化加油卡回收',
    discount: 0.95,
    notice: '请确保卡券有效且未使用',
    faceValues: [100, 200, 300, 500, 1000],
    cardNoMaxLength: 19,
    cardPwdMaxLength: 20
  },
  {
    id: 'gas_200',
    name: '中石油加油卡',
    icon: '⛽',
    category: 'travel',
    description: '支持中石油加油卡回收',
    discount: 0.94,
    notice: '请确保卡券有效且未使用',
    faceValues: [100, 200, 300, 500, 1000],
    cardNoMaxLength: 19,
    cardPwdMaxLength: 20
  },
  {
    id: 'game_100',
    name: '腾讯Q币充值卡',
    icon: '🎮',
    category: 'entertainment',
    description: '支持Q币充值卡回收',
    discount: 0.88,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100, 200],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'game_200',
    name: '网易游戏点卡',
    icon: '🎮',
    category: 'entertainment',
    description: '支持网易游戏点卡回收',
    discount: 0.87,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100, 200],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'ecommerce_100',
    name: '京东E卡',
    icon: '📦',
    category: 'ecommerce',
    description: '支持京东E卡回收',
    discount: 0.95,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100, 200, 300, 500],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'ecommerce_200',
    name: '天猫超市卡',
    icon: '🛒',
    category: 'ecommerce',
    description: '支持天猫超市卡回收',
    discount: 0.94,
    notice: '请确保卡券有效且未使用',
    faceValues: [50, 100, 200, 300, 500],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'food_100',
    name: '美团外卖红包',
    icon: '🍔',
    category: 'life',
    description: '支持美团外卖红包回收',
    discount: 0.90,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'food_200',
    name: '饿了么红包',
    icon: '🍔',
    category: 'life',
    description: '支持饿了么红包回收',
    discount: 0.89,
    notice: '请确保卡券有效且未使用',
    faceValues: [10, 20, 30, 50, 100],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  },
  {
    id: 'movie_100',
    name: '猫眼电影票',
    icon: '🎬',
    category: 'entertainment',
    description: '支持猫眼电影票回收',
    discount: 0.85,
    notice: '请确保卡券有效且未使用',
    faceValues: [30, 50, 100],
    cardNoMaxLength: 20,
    cardPwdMaxLength: 20
  }
];

// 模拟订单列表
const mockOrders = [
  {
    id: 'ORD202401010001',
    cardTypeId: 'phone_100',
    cardTypeName: '中国移动充值卡',
    cardTypeIcon: '📱',
    faceValue: 100,
    recycleAmount: 97.00,
    status: 'completed',
    statusText: '已完成',
    cardNo: '13800138000000001',
    createTime: '2024-01-01 10:30:00',
    completeTime: '2024-01-01 10:35:00'
  },
  {
    id: 'ORD202401020001',
    cardTypeId: 'gas_100',
    cardTypeName: '中石化加油卡',
    cardTypeIcon: '⛽',
    faceValue: 200,
    recycleAmount: 190.00,
    status: 'completed',
    statusText: '已完成',
    cardNo: '1000112345678901',
    createTime: '2024-01-02 14:20:00',
    completeTime: '2024-01-02 14:25:00'
  },
  {
    id: 'ORD202401030001',
    cardTypeId: 'game_100',
    cardTypeName: '腾讯Q币充值卡',
    cardTypeIcon: '🎮',
    faceValue: 50,
    recycleAmount: 44.00,
    status: 'processing',
    statusText: '处理中',
    cardNo: 'QB12345678901234',
    createTime: '2024-01-03 09:00:00',
    completeTime: null
  }
];

// 模拟银行账户
const mockBankAccounts = [
  {
    id: 'BANK001',
    bankCode: 'ICBC',
    bankName: '工商银行',
    bankIcon: '🏦',
    cardNo: '6222021234567890123',
    cardNoMask: '6222 **** **** 0123',
    isDefault: true
  }
];

// 模拟提现记录
const mockWithdraws = [
  {
    id: 'WD202401010001',
    amount: 100.00,
    status: 'completed',
    statusText: '已完成',
    bankName: '工商银行',
    bankCardNo: '6222 **** **** 0123',
    createTime: '2024-01-01 15:00:00',
    completeTime: '2024-01-01 15:30:00'
  }
];

/**
 * 模拟API响应
 */
const mockApi = {
  // 微信登录
  wxLogin(code) {
    return {
      token: mockToken,
      userInfo: {
        ...mockUserInfo,
        id: 'wx_user_001' // 固定用户ID
      }
    };
  },

  // 手机号登录（密码/验证码）
  phoneLogin(phone) {
    return {
      token: mockToken,
      userInfo: {
        ...mockUserInfo,
        id: 'phone_user_001', // 固定用户ID
        phone: phone || mockUserInfo.phone
      }
    };
  },

  // 发送验证码
  sendSmsCode(phone, type) {
    return {
      success: true,
      message: '验证码已发送'
    };
  },

  // 注册
  register(phone, code) {
    return {
      token: mockToken,
      userInfo: {
        ...mockUserInfo,
        id: 'new_user_001', // 固定用户ID
        phone,
        isVerified: false // 新用户未实名
      }
    };
  },

  // 获取用户信息
  getUserInfo() {
    return mockUserInfo;
  },

  // 实名认证
  verify(realName, idCard) {
    return {
      success: true,
      userInfo: {
        ...mockUserInfo,
        isVerified: true,
        realName,
        idCard
      }
    };
  },

  // 获取卡券类型列表
  getCardTypes() {
    return mockCardTypes;
  },

  // 获取卡券详情
  getCardDetail(id) {
    return mockCardTypes.find(item => item.id === id) || null;
  },

  // 计算回收金额
  calculateRecycle(cardTypeId, faceValue) {
    const cardType = mockCardTypes.find(item => item.id === cardTypeId);
    if (!cardType) {
      return null;
    }
    return {
      faceValue,
      discount: cardType.discount,
      recycleAmount: (faceValue * cardType.discount).toFixed(2)
    };
  },

  // 创建订单
  createOrder(orderData) {
    const cardType = mockCardTypes.find(item => item.id === orderData.cardTypeId);
    const orderId = 'ORD' + Date.now();
    return {
      orderId,
      faceValue: orderData.faceValue,
      recycleAmount: (orderData.faceValue * cardType.discount).toFixed(2),
      status: 'processing',
      createTime: new Date().toLocaleString()
    };
  },

  // 获取订单列表
  getOrders(status, page, pageSize) {
    let orders = [...mockOrders];
    if (status && status !== 'all') {
      orders = orders.filter(item => item.status === status);
    }
    return {
      list: orders,
      total: orders.length,
      page,
      pageSize
    };
  },

  // 获取订单详情
  getOrderDetail(orderId) {
    return mockOrders.find(item => item.id === orderId) || null;
  },

  // 获取银行账户列表
  getBankAccounts() {
    return mockBankAccounts;
  },

  // 添加银行账户
  addBankAccount(data) {
    return {
      id: 'BANK' + Date.now(),
      ...data,
      isDefault: mockBankAccounts.length === 0
    };
  },

  // 获取提现记录
  getWithdraws(page, pageSize) {
    return {
      list: mockWithdraws,
      total: mockWithdraws.length,
      page,
      pageSize
    };
  },

  // 创建提现
  createWithdraw(amount, bankId) {
    return {
      id: 'WD' + Date.now(),
      amount,
      status: 'processing',
      statusText: '处理中',
      createTime: new Date().toLocaleString()
    };
  },

  // 提交留言反馈
  submitFeedback(data) {
    return {
      id: 'FB' + Date.now(),
      category: data.category,
      content: data.content,
      contact: data.contact,
      userId: data.userId,
      status: 'pending',
      createTime: new Date().toLocaleString()
    };
  },

  // 获取反馈记录列表
  getFeedbackList(userId, page, pageSize) {
    return {
      list: mockFeedbackRecords,
      total: mockFeedbackRecords.length,
      page,
      pageSize
    };
  }
};

// 模拟反馈记录
const mockFeedbackRecords = [
  {
    id: 'FB202401010001',
    type: 'suggestion',
    content: '希望增加更多卡券类型，比如支持星巴克礼品卡回收',
    images: [],
    contact: '13800138000',
    userId: '10001',
    status: 'replied',
    reply: '感谢您的建议，我们正在评估新增更多卡券类型的可行性，预计下月上线星巴克礼品卡回收功能。',
    createTime: '2024-01-10 14:30:00'
  },
  {
    id: 'FB202401020001',
    type: 'bug',
    content: '提交订单时页面偶尔会卡顿，需要等待很久才能提交成功',
    images: [],
    contact: '',
    userId: '10001',
    status: 'processing',
    reply: '',
    createTime: '2024-01-15 09:00:00'
  }
];

module.exports = {
  mockUserInfo,
  mockToken,
  mockCardTypes,
  mockOrders,
  mockBankAccounts,
  mockWithdraws,
  mockFeedbackRecords,
  mockApi
};
