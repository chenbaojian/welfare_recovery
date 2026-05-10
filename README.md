# 福利回收微信小程序

## 项目简介

福利回收小程序是一个卡券回收服务平台，为用户提供便捷的卡券回收服务，将闲置的各类卡券、积分兑换为现金，实现资源变现。

### 支持回收类型

| 类别 | 具体类型 |
|------|----------|
| 通信类 | 电话卡 |
| 出行类 | 加油卡、出行券 |
| 娱乐类 | 游戏卡、电影券、影音券 |
| 电商类 | 电商卡、京东E卡 |
| 生活类 | 商超卡、美食券 |
| 积分类 | 美团企业积分、劳保积分、携程积分 |

---

## 项目结构

```
福利收回/
├── miniprogram/              # 小程序前端代码
│   ├── app.js               # 小程序入口
│   ├── app.json             # 小程序配置
│   ├── app.wxss             # 全局样式
│   ├── sitemap.json         # 站点地图配置
│   ├── project.config.json  # 项目配置
│   ├── package.json         # npm依赖配置
│   ├── config/              # 配置文件
│   │   ├── index.js         # 主配置
│   │   ├── api.js           # API接口配置
│   │   └── constants.js     # 常量定义
│   ├── utils/               # 工具类
│   │   ├── request.js       # 网络请求封装
│   │   ├── validate.js      # 表单验证
│   │   ├── crypto.js        # 加密工具
│   │   ├── cache.js         # 缓存工具
│   │   ├── util.js          # 通用工具
│   │   └── auth.js          # 授权工具
│   ├── components/          # 公共组件
│   │   ├── order-card/      # 订单卡片组件
│   │   ├── empty/           # 空状态组件
│   │   ├── loading/         # 加载组件
│   │   └── card-item/       # 卡券项组件
│   ├── assets/              # 静态资源
│   │   └── icons/           # 图标资源
│   └── pages/               # 页面
│       ├── index/           # 首页
│       ├── login/           # 登录页
│       ├── verify/          # 实名认证页
│       ├── detail/          # 卡券详情页
│       ├── order/           # 订单相关
│       │   ├── list/        # 订单列表
│       │   └── detail/      # 订单详情
│       ├── mine/            # 个人中心
│       ├── withdraw/        # 提现页
│       ├── bank/            # 结算账户页
│       └── webview/         # 网页容器
├── server/                   # 后端服务代码
│   ├── package.json         # 依赖配置
│   ├── .env.example         # 环境变量示例
│   ├── src/
│   │   ├── app.js           # 服务入口
│   │   ├── routes/          # 路由
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 服务层
│   │   ├── models/          # 数据模型
│   │   ├── middleware/      # 中间件
│   │   ├── config/          # 配置
│   │   └── utils/           # 工具
│   └── database/            # 数据库
│       └── init.sql         # 初始化脚本
├── project.config.json       # 小程序项目配置
├── 福利回收需求文档.md
├── 福利回收开发设计文档.md
└── README.md
```

---

## 技术栈

### 前端（小程序）
- **框架**: 微信小程序原生开发
- **UI组件库**: Vant Weapp (v1.11.7)
- **状态管理**: 小程序原生数据绑定
- **网络请求**: 自封装 request 工具

### 后端
- **运行环境**: Node.js (>=16.0.0)
- **Web框架**: Express (v4.18.2)
- **数据库**: MySQL 8.0 + Sequelize ORM
- **缓存**: Redis
- **认证**: JWT (jsonwebtoken)
- **日志**: Winston
- **安全**: Helmet、CORS、Rate Limit

---

## 环境要求

### 开发环境

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| 微信开发者工具 | 最新稳定版 | 小程序开发、调试、预览 |
| Node.js | >= 16.0.0 | 后端服务运行环境 |
| MySQL | >= 8.0 | 数据库 |
| Redis | >= 6.0 | 缓存服务 |
| npm | >= 8.0 | 包管理器 |

### 推荐开发工具
- **微信开发者工具**: 必须安装，用于小程序开发
- **VS Code**: 推荐用于后端开发
- **Navicat / MySQL Workbench**: 数据库管理工具
- **Redis Desktop Manager**: Redis可视化管理工具

---

## 快速开始

### 第一步：准备工作

#### 1. 下载并安装微信开发者工具

1. 访问微信开发者工具下载页面：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
2. 根据您的操作系统选择对应版本下载：
   - Windows: 选择 Windows 64位 或 32位版本
   - macOS: 选择 macOS 版本
   - Linux: 选择 Linux 版本
3. 安装完成后打开微信开发者工具
4. 使用微信扫码登录

#### 2. 注册微信小程序账号

1. 访问微信公众平台：https://mp.weixin.qq.com/
2. 点击"立即注册"，选择"小程序"
3. 填写账号信息，完成注册流程
4. 登录小程序后台，获取 AppID：
   - 进入"开发" -> "开发管理" -> "开发设置"
   - 复制 AppID（格式类似：wx1234567890abcdef）

#### 3. 安装 Node.js

1. 访问 Node.js 官网：https://nodejs.org/
2. 下载 LTS（长期支持）版本，推荐 v18.x 或更高版本
3. 安装完成后，打开命令行验证：
   ```bash
   node -v    # 应显示 v16.x.x 或更高
   npm -v     # 应显示 8.x.x 或更高
   ```

#### 4. 安装 MySQL

1. 访问 MySQL 官网：https://dev.mysql.com/downloads/mysql/
2. 下载 MySQL 8.0 版本
3. 安装并配置 MySQL：
   - 设置 root 密码
   - 创建数据库（见后端配置部分）

#### 5. 安装 Redis（可选，用于缓存）

1. Windows 用户：
   - 下载 Redis Windows 版本：https://github.com/microsoftarchive/redis/releases
   - 或使用 Docker：`docker run -d -p 6379:6379 redis`
2. macOS 用户：
   ```bash
   brew install redis
   brew services start redis
   ```
3. Linux 用户：
   ```bash
   sudo apt install redis-server
   sudo systemctl start redis
   ```

---

### 第二步：小程序端配置与运行

#### 1. 导入项目

1. 打开微信开发者工具
2. 点击左侧"小程序"选项
3. 点击"+"号或"导入项目"
4. 选择项目目录：`D:\福利收回`（或您实际的项目路径）
5. 填写 AppID：
   - 如果已有 AppID，填入您的 AppID
   - 如果没有 AppID，可选择"测试号"或点击"使用测试号"
6. 点击"导入"

#### 2. 配置 AppID

打开 `project.config.json` 文件，修改 `appid` 字段：

```json
{
  "appid": "wx1234567890abcdef",  // 替换为您的 AppID
  "projectname": "welfare-recovery",
  "miniprogramRoot": "miniprogram/",
  ...
}
```

#### 3. 安装 npm 依赖

在微信开发者工具中：

1. 点击顶部菜单"工具" -> "构建 npm"
2. 如果提示"没有找到 package.json"，请先在终端安装依赖：
   
   打开命令行/终端，进入 miniprogram 目录：
   ```bash
   cd D:\福利收回\miniprogram
   npm install
   ```
   
   或者在微信开发者工具中：
   1. 点击"终端" -> "新建终端"
   2. 在终端中执行：
   ```bash
   npm install
   ```

3. 安装完成后，点击"工具" -> "构建 npm"
4. 构建成功后，会在 miniprogram 目录下生成 `miniprogram_npm` 目录

#### 4. 配置 API 地址

打开 `miniprogram/config/index.js`，修改 API 地址：

```javascript
// 开发环境配置（本地调试）
development: {
  baseUrl: 'http://localhost:3000/api',  // 本地后端服务地址
  timeout: 10000
},

// 测试环境配置
test: {
  baseUrl: 'https://test-api.yourdomain.com/api',  // 测试服务器地址
  timeout: 10000
},

// 生产环境配置
production: {
  baseUrl: 'https://api.yourdomain.com/api',  // 正式服务器地址
  timeout: 10000
}
```

#### 5. 运行小程序

1. 在微信开发者工具中，点击顶部"编译"按钮
2. 编译成功后，会在模拟器中显示小程序界面
3. 可以在模拟器中调试各个页面功能

#### 6. 预览与真机调试

**预览功能**：
1. 点击顶部"预览"按钮
2. 生成预览二维码
3. 使用微信扫描二维码，在真机上预览小程序

**真机调试**：
1. 点击顶部"真机调试"按钮
2. 选择"自动调试"或"手动调试"
3. 扫码后在真机上进行调试，可查看控制台日志

---

### 第三步：后端服务配置与运行

#### 1. 配置环境变量

1. 进入 server 目录：
   ```bash
   cd D:\福利收回\server
   ```

2. 复制环境变量模板：
   ```bash
   copy .env.example .env    # Windows
   # 或
   cp .env.example .env      # macOS/Linux
   ```

3. 编辑 `.env` 文件，配置各项参数：

   ```env
   # 环境配置
   NODE_ENV=development
   PORT=3000

   # 数据库配置（请根据实际情况修改）
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=welfare_recovery
   DB_USER=root
   DB_PASSWORD=your_mysql_password   # 修改为您的MySQL密码

   # Redis配置
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=                    # 如果Redis有密码则填写

   # JWT配置（请修改为随机字符串）
   JWT_SECRET=your_random_secret_key_at_least_32_chars
   JWT_EXPIRE=7d

   # 微信小程序配置（请填写您的微信小程序信息）
   WX_APPID=wx1234567890abcdef        # 您的AppID
   WX_SECRET=your_app_secret_key      # 小程序后台获取

   # 加密配置（请修改为随机字符串）
   CRYPTO_KEY=your_crypto_key_16chars

   # 日志配置
   LOG_LEVEL=info
   LOG_FILE=logs/app.log
   ```

#### 2. 创建数据库

使用 MySQL 命令行或数据库管理工具：

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE welfare_recovery DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选）
CREATE USER 'welfare'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON welfare_recovery.* TO 'welfare'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

#### 3. 初始化数据库表结构

```bash
# 进入 server 目录
cd D:\福利收回\server

# 执行初始化脚本
mysql -u root -p welfare_recovery < database/init.sql
```

或者使用数据库管理工具（如 Navicat）：
1. 连接到 MySQL
2. 选择 welfare_recovery 数据库
3. 打开 `database/init.sql` 文件
4. 执行 SQL 脚本

#### 4. 安装后端依赖

```bash
cd D:\福利收回\server
npm install
```

安装的主要依赖包括：
- express: Web框架
- mysql2 & sequelize: 数据库驱动和ORM
- redis: Redis客户端
- jsonwebtoken: JWT认证
- dotenv: 环境变量管理
- 其他安全、日志、验证工具

#### 5. 启动后端服务

**开发模式（推荐，支持热重载）**：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

启动成功后，控制台会显示：
```
Server is running on port 3000
Database connected successfully
Redis connected successfully
```

#### 6. 验证服务是否正常

打开浏览器或使用 curl 测试：

```bash
# 测试健康检查接口
curl http://localhost:3000/api/health

# 或在浏览器访问
http://localhost:3000/api/health
```

正常响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 第四步：前后端联调

#### 1. 确认服务状态

确保以下服务都在运行：
- MySQL 数据库服务
- Redis 缓存服务（可选）
- 后端 Node.js 服务（端口 3000）

#### 2. 配置小程序请求地址

确保 `miniprogram/config/index.js` 中的开发环境 API 地址正确：
```javascript
development: {
  baseUrl: 'http://localhost:3000/api',
  timeout: 10000
}
```

#### 3. 在微信开发者工具中调试

1. 打开微信开发者工具
2. 点击"调试器"面板
3. 选择"Network"标签
4. 在小程序中触发网络请求（如登录）
5. 查看请求是否成功发送到后端

#### 4. 处理跨域问题

微信小程序开发环境中，需要在微信开发者工具中设置：

1. 点击右上角"详情"
2. 选择"本地设置"
3. 勾选"不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"

**注意**：生产环境必须配置合法域名，在小程序后台：
- 进入"开发" -> "开发管理" -> "开发设置" -> "服务器域名"
- 添加 request 合法域名

---

## 功能模块说明

### 用户模块
| 功能 | 页面 | 说明 |
|------|------|------|
| 微信登录 | login | 微信授权一键登录 |
| 手机号登录 | login | 微信授权获取手机号 |
| 实名认证 | verify | 姓名+身份证号验证 |
| 个人中心 | mine | 用户信息、余额、提现 |

### 卡券模块
| 功能 | 页面 | 说明 |
|------|------|------|
| 卡券分类 | index | 首页展示各类卡券 |
| 卡券详情 | detail | 选择面值、输入卡号卡密 |
| 回收计算 | detail | 自动计算回收金额 |

### 订单模块
| 功能 | 页面 | 说明 |
|------|------|------|
| 订单列表 | order/list | 查看所有订单 |
| 订单详情 | order/detail | 订单详细信息 |
| 状态跟踪 | order/detail | 订单处理状态 |

### 结算模块
| 功能 | 页面 | 说明 |
|------|------|------|
| 提现申请 | withdraw | 申请提现到银行卡 |
| 结算账户 | bank | 绑定/管理银行卡 |

---

## 开发进度

- [x] 小程序项目结构搭建
- [x] 工具类开发（request、validate、crypto、cache、auth）
- [x] 公共组件开发（order-card、empty、loading、card-item）
- [x] 登录页面（微信登录、手机号登录）
- [x] 实名认证页面
- [x] 首页（卡券分类展示）
- [x] 卡券详情页（回收流程）
- [x] 订单列表和详情页
- [x] 个人中心页面
- [x] 提现和结算账户页面
- [x] 后端服务代码框架
- [x] 数据库设计
- [ ] 接入第三方实名认证服务
- [ ] 接入第三方卡券回收平台
- [ ] 接入支付系统
- [ ] 完整测试和优化

---

## 常见问题与解决方案

### Q1: 编译报错 "requiredPrivateInfos 字段需为..."

**原因**: `app.json` 中配置了无效的隐私接口声明。

**解决方案**: 已修复，确保 `app.json` 中没有 `requiredPrivateInfos` 字段，或只包含有效的位置接口声明。

### Q2: 编译报错 "subpackages root field needs to be Directory"

**原因**: 配置了分包但目录不存在。

**解决方案**: 已修复，删除了不存在的 subpackages 配置。

### Q3: tabBar 图标找不到

**原因**: 图标文件不存在。

**解决方案**: 已创建占位图标文件，如需自定义图标，请替换 `miniprogram/assets/icons/` 目录下的 PNG 文件。

### Q4: npm 构建失败

**解决方案**:
1. 确保 miniprogram 目录下有 package.json
2. 在终端执行 `npm install`
3. 在微信开发者工具中点击"工具" -> "构建 npm"

### Q5: 网络请求失败

**检查项**:
1. 后端服务是否启动（访问 http://localhost:3000/api/health）
2. API 地址配置是否正确
3. 开发工具中是否勾选"不校验合法域名"

### Q6: 数据库连接失败

**检查项**:
1. MySQL 服务是否启动
2. `.env` 中数据库配置是否正确
3. 数据库是否已创建

---

## 部署指南

### 小程序发布

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 登录小程序后台，提交审核
4. 审核通过后发布上线

### 后端部署

#### 服务器要求
- 操作系统：Linux (推荐 CentOS 7+ 或 Ubuntu 18+)
- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0
- 内存 >= 2GB
- 存储 >= 20GB

#### 部署步骤

1. **安装 Node.js**
   ```bash
   # CentOS
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   
   # Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **上传代码**
   ```bash
   # 使用 git clone 或 scp 上传
   git clone your-repo-url
   # 或
   scp -r server/ user@server:/path/to/app/
   ```

3. **安装依赖**
   ```bash
   cd /path/to/app/server
   npm install --production
   ```

4. **配置环境变量**
   ```bash
   cp .env.example .env
   vim .env  # 编辑配置
   ```

5. **初始化数据库**
   ```bash
   mysql -u root -p welfare_recovery < database/init.sql
   ```

6. **使用 PM2 管理进程**
   ```bash
   npm install -g pm2
   pm2 start src/app.js --name welfare-api
   pm2 save
   pm2 startup
   ```

7. **配置 Nginx 反向代理**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location /api {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

8. **配置 HTTPS**
   - 申请 SSL 证书（推荐阿里云、腾讯云免费证书）
   - 配置 Nginx SSL
   - 在小程序后台配置服务器域名

---

## 联系与支持

如有问题，请参考：
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Vant Weapp 组件库文档](https://vant-contrib.gitee.io/vant-weapp/)
- 项目需求文档：`福利回收需求文档.md`
- 项目设计文档：`福利回收开发设计文档.md`

---

## 许可证

本项目仅供学习和参考使用。