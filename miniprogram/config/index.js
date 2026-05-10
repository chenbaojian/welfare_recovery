// config/index.js - 主配置文件

const config = {
  // 应用信息
  app: {
    name: '福利回收',
    version: '1.0.0',
    description: '卡券回收小程序'
  },

  // API配置
  api: {
    // 开发环境
    development: {
      baseUrl: 'http://127.0.0.1:3000/api',
      timeout: 10000
    },
    // 测试环境
    test: {
      baseUrl: 'https://test-api.example.com/api',
      timeout: 10000
    },
    // 生产环境
    production: {
      baseUrl: 'https://api.example.com/api',
      timeout: 10000
    }
  },

  // 微信配置
  wechat: {
    appId: 'your-appid-here',
    // 授权scope
    scopes: {
      userInfo: 'scope.userInfo',
      userLocation: 'scope.userLocation',
      phoneNumber: 'scope.phoneNumber'
    }
  },

  // 存储key
  storageKeys: {
    token: 'token',
    userInfo: 'userInfo',
    bankAccount: 'bankAccount',
    searchHistory: 'searchHistory',
    currentMode: 'currentMode'
  },

  // 缓存配置
  cache: {
    prefix: 'cache:',
    defaultExpire: 5 * 60 * 1000 // 5分钟
  },

  // 分页配置
  pagination: {
    defaultPage: 1,
    defaultSize: 10,
    maxSize: 50
  },

  // 文件上传配置
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptTypes: ['image/jpeg', 'image/png', 'image/gif']
  },

  // 实名认证配置
  verify: {
    nameMinLength: 2,
    nameMaxLength: 20,
    idCardLength: 18
  },

  // 订单状态
  orderStatus: {
    PENDING: {
      value: 'PENDING',
      text: '待处理',
      color: '#FAAD14'
    },
    PROCESSING: {
      value: 'PROCESSING',
      text: '处理中',
      color: '#1890FF'
    },
    SUCCESS: {
      value: 'SUCCESS',
      text: '已完成',
      color: '#52C41A'
    },
    FAILED: {
      value: 'FAILED',
      text: '已失败',
      color: '#F5222D'
    },
    CANCELLED: {
      value: 'CANCELLED',
      text: '已取消',
      color: '#999999'
    }
  },

  // 提现状态
  withdrawStatus: {
    PENDING: {
      value: 'PENDING',
      text: '待处理',
      color: '#FAAD14'
    },
    PROCESSING: {
      value: 'PROCESSING',
      text: '处理中',
      color: '#1890FF'
    },
    SUCCESS: {
      value: 'SUCCESS',
      text: '已完成',
      color: '#52C41A'
    },
    FAILED: {
      value: 'FAILED',
      text: '已失败',
      color: '#F5222D'
    }
  },

  // 买家订单状态
  buyOrderStatus: {
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
  }
};

// 根据环境获取配置
function getConfig() {
  // 安全获取环境变量
  let env = 'develop';
  try {
    if (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) {
      env = __wxConfig.envVersion;
    }
  } catch (e) {
    // 使用默认环境
  }

  const envMap = {
    develop: 'development',
    trial: 'test',
    release: 'production'
  };

  const currentEnv = envMap[env] || 'development';

  return {
    ...config,
    env: currentEnv,
    baseUrl: config.api[currentEnv].baseUrl,
    timeout: config.api[currentEnv].timeout
  };
}

module.exports = getConfig();
