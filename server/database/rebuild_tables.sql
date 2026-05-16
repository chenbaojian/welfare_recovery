-- 修复脚本：重建表结构，清理 Sequelize sync({alter:true}) 反复执行导致的重复索引
-- 使用方法：mysql -u root -p welfare_recovery < rebuild_tables.sql
-- 注意：此操作会删除所有数据！如果需要保留数据，请先备份！

USE welfare_recovery;

-- 删除所有表（按依赖顺序）
DROP TABLE IF EXISTS `balance_log`;
DROP TABLE IF EXISTS `withdraw`;
DROP TABLE IF EXISTS `order`;
DROP TABLE IF EXISTS `bank`;
DROP TABLE IF EXISTS `card_product`;
DROP TABLE IF EXISTS `card_type`;
DROP TABLE IF EXISTS `admin`;
DROP TABLE IF EXISTS `user`;

-- 重新创建用户表
CREATE TABLE `user` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `open_id` VARCHAR(64) DEFAULT NULL COMMENT '微信openid',
  `session_key` VARCHAR(64) DEFAULT NULL COMMENT '微信session_key',
  `phone` VARCHAR(11) DEFAULT NULL COMMENT '手机号',
  `password` VARCHAR(64) DEFAULT NULL COMMENT '密码（MD5加密）',
  `nickname` VARCHAR(30) DEFAULT NULL COMMENT '昵称',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像',
  `real_name` VARCHAR(20) DEFAULT NULL COMMENT '真实姓名',
  `id_card` VARCHAR(18) DEFAULT NULL COMMENT '身份证号',
  `is_verified` TINYINT(1) DEFAULT 0 COMMENT '是否实名认证',
  `verify_time` DATETIME DEFAULT NULL COMMENT '认证时间',
  `balance` DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  `total_recycle` DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计回收金额',
  `order_count` INT DEFAULT 0 COMMENT '订单数量',
  `login_type` VARCHAR(10) DEFAULT NULL COMMENT '登录方式',
  `status` VARCHAR(10) DEFAULT 'ACTIVE' COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_open_id` (`open_id`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_id_card` (`id_card`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 重新创建卡券类型表
CREATE TABLE `card_type` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `name` VARCHAR(50) NOT NULL COMMENT '名称',
  `category` VARCHAR(20) DEFAULT NULL COMMENT '分类',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '描述',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT '图标',
  `discount_rate` DECIMAL(3,2) DEFAULT 0.95 COMMENT '折扣率',
  `face_values` JSON DEFAULT NULL COMMENT '支持的面值',
  `card_no_min_length` INT DEFAULT 10 COMMENT '卡号最小长度',
  `card_no_max_length` INT DEFAULT 30 COMMENT '卡号最大长度',
  `card_pwd_min_length` INT DEFAULT 6 COMMENT '卡密最小长度',
  `card_pwd_max_length` INT DEFAULT 20 COMMENT '卡密最大长度',
  `notice` VARCHAR(255) DEFAULT NULL COMMENT '注意事项',
  `is_hot` TINYINT(1) DEFAULT 0 COMMENT '是否热门',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` VARCHAR(10) DEFAULT 'ACTIVE' COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='卡券类型表';

-- 重新创建订单表
CREATE TABLE `order` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `order_no` VARCHAR(20) NOT NULL COMMENT '订单号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `card_type_id` INT NOT NULL COMMENT '卡券类型ID',
  `card_type_name` VARCHAR(50) NOT NULL COMMENT '卡券类型名称',
  `face_value` DECIMAL(10,2) NOT NULL COMMENT '面值金额',
  `recycle_amount` DECIMAL(10,2) NOT NULL COMMENT '回收金额',
  `card_no` VARCHAR(255) NOT NULL COMMENT '卡号(加密)',
  `card_pwd` VARCHAR(255) NOT NULL COMMENT '卡密(加密)',
  `status` VARCHAR(20) DEFAULT 'PENDING' COMMENT '状态',
  `fail_reason` VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  `complete_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 重新创建结算账户表
CREATE TABLE `bank` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `bank_code` VARCHAR(10) NOT NULL COMMENT '银行代码',
  `bank_name` VARCHAR(50) NOT NULL COMMENT '银行名称',
  `card_no` VARCHAR(19) NOT NULL COMMENT '银行卡号',
  `real_name` VARCHAR(20) NOT NULL COMMENT '持卡人姓名',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认',
  `status` VARCHAR(10) DEFAULT 'ACTIVE' COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算账户表';

-- 重新创建提现表
CREATE TABLE `withdraw` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `withdraw_no` VARCHAR(20) NOT NULL COMMENT '提现单号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '提现金额',
  `bank_id` INT NOT NULL COMMENT '结算账户ID',
  `bank_name` VARCHAR(50) NOT NULL COMMENT '银行名称',
  `bank_card_no` VARCHAR(19) NOT NULL COMMENT '银行卡号',
  `real_name` VARCHAR(20) NOT NULL COMMENT '持卡人姓名',
  `status` VARCHAR(20) DEFAULT 'PENDING' COMMENT '状态',
  `fail_reason` VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  `complete_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_withdraw_no` (`withdraw_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现表';

-- 重新创建管理员表
CREATE TABLE `admin` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '管理员ID',
  `username` VARCHAR(30) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(bcrypt加密)',
  `real_name` VARCHAR(20) DEFAULT NULL COMMENT '真实姓名',
  `role` VARCHAR(20) DEFAULT 'OPERATOR' COMMENT '角色',
  `status` VARCHAR(10) DEFAULT 'ACTIVE' COMMENT '状态',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 重新创建余额流水表
CREATE TABLE `balance_log` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `order_id` INT DEFAULT NULL COMMENT '关联订单ID',
  `type` VARCHAR(20) NOT NULL COMMENT '类型',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '变动金额',
  `balance_before` DECIMAL(10,2) NOT NULL COMMENT '变动前余额',
  `balance_after` DECIMAL(10,2) NOT NULL COMMENT '变动后余额',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `operator_id` INT DEFAULT NULL COMMENT '操作人ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额流水表';

-- 初始化管理员数据（密码: admin123）
INSERT INTO `admin` (`username`, `password`, `real_name`, `role`) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3YD7QFmGJ0WKfOY3E6eP3F3HK2W', '系统管理员', 'SUPER_ADMIN');

-- 初始化卡券类型数据（face_values 与小程序实际使用的面值保持一致）
INSERT INTO `card_type` (`name`, `category`, `description`, `discount_rate`, `face_values`, `is_hot`, `sort`) VALUES
('话费充值卡', 'telecom', '移动/联通/电信话费充值卡', 0.95, '[20,30,50,100]', 1, 1),
('加油卡', 'travel', '中石化/中石油加油卡', 0.92, '[50,100,200,500,1000]', 1, 2),
('游戏点卡', 'entertainment', '各类游戏点卡/充值卡', 0.88, '[10,20,30,50,100,300,500,1000]', 1, 3),
('京东E卡', 'ecommerce', '京东商城电子卡', 0.95, '[10,20,30,40,50,70,100,150,200,300,400,500,600,800,888,1000,1500,2000,3000,4000,5000]', 1, 4),
('超市购物卡', 'life', '各大超市购物卡', 0.90, '[100,200,300,500,1000,2000]', 0, 5),
('电影票券', 'entertainment', '各大影院电影票券', 0.85, '[30,50,100]', 0, 6),
('美食代金券', 'life', '各类美食代金券', 0.88, '[100,200,300,500,1000,2000]', 0, 7),
('出行券', 'travel', '滴滴/高德出行券', 0.90, '[10,20,50,100]', 0, 8),
('美团企业积分', 'points', '美团企业积分兑换', 0.92, '[100,200,500,800,1000,2000,3000,4000,5000]', 0, 9),
('劳保积分', 'points', '企业劳保积分', 0.90, '[50,100,200,500]', 0, 10),
('携程积分', 'points', '携程旅行积分', 0.88, '[100,200,500,1000]', 0, 11),
('影音会员', 'entertainment', '爱奇艺/腾讯/优酷会员', 0.85, '[15,30,50,100]', 0, 12),
('电商礼品卡', 'ecommerce', '淘宝/拼多多礼品卡', 0.92, '[100,200,300,500,1000,2000]', 0, 13);

-- 重新创建卡产品表
CREATE TABLE `card_product` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `card_type_id` INT NOT NULL COMMENT '所属卡类型ID',
  `name` VARCHAR(100) NOT NULL COMMENT '具体卡名称',
  `face_values` JSON DEFAULT NULL COMMENT '支持的面值',
  `discount_rate` DECIMAL(3,2) DEFAULT 0.95 COMMENT '收卡折扣率',
  `buy_discount_rate` DECIMAL(3,2) DEFAULT 0.95 COMMENT '卖卡折扣率',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` VARCHAR(10) DEFAULT 'ACTIVE' COMMENT '状态: ACTIVE-启用, DISABLED-禁用',
  `is_hot` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否热门: 1-是, 0-否',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_card_type_id` (`card_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='卡产品表';

-- 初始化卡产品数据（面值来源于小程序各页面实际使用的值）
INSERT INTO `card_product` (`card_type_id`, `name`, `face_values`, `discount_rate`, `buy_discount_rate`, `sort`, `status`) VALUES
-- 话费充值卡（card_type_id=1）
(1, '中国移动充值卡', '[20,30,50,100]', 0.98, 0.98, 1, 'ACTIVE'),
(1, '中国联通充值卡', '[20,30,50,100]', 0.97, 0.97, 2, 'ACTIVE'),
(1, '中国电信充值卡', '[20,30,50,100]', 0.96, 0.96, 3, 'ACTIVE'),
-- 加油卡（card_type_id=2）
(2, '中国石化加油卡', '[50,100,200,500,1000]', 0.95, 0.95, 1, 'ACTIVE'),
(2, '中国石油加油卡', '[50,100,200,500,1000]', 0.94, 0.94, 2, 'ACTIVE'),
(2, '中国海油加油卡', '[50,100,200,500,1000]', 0.93, 0.93, 3, 'ACTIVE'),
-- 游戏点卡（card_type_id=3）
(3, '网易一卡通', '[10,20,30,50,100,300,500,1000]', 0.90, 0.90, 1, 'ACTIVE'),
-- 京东E卡（card_type_id=4）
(4, '京东E卡', '[10,20,30,40,50,70,100,150,200,300,400,500,600,800,888,1000,1500,2000,3000,4000,5000]', 0.97, 0.97, 1, 'ACTIVE'),
-- 超市购物卡（card_type_id=5）
(5, '沃尔玛卡', '[100,200,300,500,1000,2000]', 0.92, 0.92, 1, 'ACTIVE'),
(5, '盒马生鲜', '[100,200,300,500,1000,2000]', 0.92, 0.92, 2, 'ACTIVE'),
(5, '朴朴超市', '[100,200,300,500,1000,2000]', 0.92, 0.92, 3, 'ACTIVE'),
(5, '小象超市', '[100,200,300,500,1000,2000]', 0.92, 0.92, 4, 'ACTIVE'),
(5, '红旗连锁', '[100,200,300,500,1000,2000]', 0.92, 0.92, 5, 'ACTIVE'),
-- 美食代金券（card_type_id=7）
(7, '瑞幸咖啡', '[100,200,300,500,1000,2000]', 0.88, 0.88, 1, 'ACTIVE'),
(7, '肯德基', '[100,200,300,500,1000,2000]', 0.88, 0.88, 2, 'ACTIVE'),
(7, '爱达乐', '[100,200,300,500,1000,2000]', 0.88, 0.88, 3, 'ACTIVE'),
(7, '好利来', '[100,200,300,500,1000,2000]', 0.88, 0.88, 4, 'ACTIVE'),
(7, '霸王茶姬', '[100,200,300,500,1000,2000]', 0.88, 0.88, 5, 'ACTIVE'),
(7, '味多美', '[100,200,300,500,1000,2000]', 0.88, 0.88, 6, 'ACTIVE'),
(7, '元祖食品', '[100,200,300,500,1000,2000]', 0.88, 0.88, 7, 'ACTIVE'),
(7, '星巴克', '[100,200,300,500,1000,2000]', 0.88, 0.88, 8, 'ACTIVE'),
-- 美团企业积分（card_type_id=9）
(9, '美团企业积分', '[100,200,500,800,1000,2000,3000,4000,5000]', 0.75, 0.75, 1, 'ACTIVE'),
-- 电商礼品卡（card_type_id=13）
(13, '京东超市卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 1, 'ACTIVE'),
(13, '永辉超市卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 2, 'ACTIVE'),
(13, '美团礼品卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 3, 'ACTIVE'),
(13, '天猫超市卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 4, 'ACTIVE'),
(13, '银泰百货银泰卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 5, 'ACTIVE'),
(13, '苏宁易购礼品卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 6, 'ACTIVE'),
(13, '中百超市购物卡', '[100,200,300,500,1000,2000]', 0.97, 0.97, 7, 'ACTIVE');