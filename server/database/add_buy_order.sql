-- 福利回收 - 我是买家功能数据库变更脚本

USE welfare_recovery;

-- ============================================
-- 1. 新增购买订单表 (buy_order)
-- ============================================
CREATE TABLE IF NOT EXISTS `buy_order` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '购买订单ID',
  `order_no` VARCHAR(20) NOT NULL COMMENT '购买订单号(前缀BUY)',
  `buyer_id` INT NOT NULL COMMENT '买家用户ID',
  `recycle_order_id` INT NOT NULL COMMENT '关联的回收订单ID',
  `card_type_id` INT NOT NULL COMMENT '卡券类型ID',
  `card_type_name` VARCHAR(50) NOT NULL COMMENT '卡券类型名称',
  `face_value` DECIMAL(10,2) NOT NULL COMMENT '面值金额',
  `discount_rate` DECIMAL(3,2) NOT NULL COMMENT '购买折扣率',
  `buy_price` DECIMAL(10,2) NOT NULL COMMENT '购买价格(面值×折扣率)',
  `card_no` VARCHAR(255) DEFAULT NULL COMMENT '卡号(加密,支付成功后解密展示)',
  `card_pwd` VARCHAR(255) DEFAULT NULL COMMENT '卡密(加密,支付成功后解密展示)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING-待支付, PAID-已支付, CANCELLED-已取消',
  `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
  `cancel_time` DATETIME DEFAULT NULL COMMENT '取消时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  UNIQUE KEY `uk_recycle_order_id` (`recycle_order_id`) COMMENT '一个回收订单只能被购买一次',
  KEY `idx_buyer_id` (`buyer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_card_type_id` (`card_type_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购买订单表';

-- ============================================
-- 2. 订单表 (order) 新增字段
-- ============================================
ALTER TABLE `order` ADD COLUMN `is_sold` TINYINT(1) DEFAULT 0 COMMENT '是否已售出: 0-未售出, 1-已售出' AFTER `complete_time`;
ALTER TABLE `order` ADD COLUMN `buy_order_id` INT DEFAULT NULL COMMENT '关联的购买订单ID' AFTER `is_sold`;
ALTER TABLE `order` ADD INDEX `idx_is_sold` (`is_sold`);
ALTER TABLE `order` ADD INDEX `idx_status_sold` (`status`, `is_sold`);

-- ============================================
-- 3. 用户表 (user) 新增字段
-- ============================================
ALTER TABLE `user` ADD COLUMN `current_mode` VARCHAR(10) DEFAULT 'SELLER' COMMENT '当前模式: SELLER-我要卖卡, BUYER-我是买家' AFTER `order_count`;
ALTER TABLE `user` ADD COLUMN `total_buy` DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计购买金额' AFTER `total_recycle`;
ALTER TABLE `user` ADD COLUMN `buy_order_count` INT DEFAULT 0 COMMENT '购买订单数量' AFTER `total_buy`;