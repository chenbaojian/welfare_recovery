# 数据库变更记录

## 2026-05-15：card_type表新增icon_url字段

### 变更说明
为卡券类型增加可配置的图标图片URL字段 `icon_url`，支持在后台管理系统中为每种卡类型配置自定义图标。
- `icon_url` 优先级高于 `icon` 字段（emoji）
- 前端展示逻辑：有 `icon_url` 则显示图片，否则显示彩色圆形默认图标
- 支持本地路径（如 `/uploads/icons/phone.png`）或网络URL

### 执行SQL

```sql
ALTER TABLE `card_type` ADD COLUMN `icon_url` VARCHAR(500) DEFAULT NULL COMMENT '图标图片URL（后台可配置，优先于icon字段）' AFTER `icon`;
```

### 回滚SQL

```sql
ALTER TABLE `card_type` DROP COLUMN `icon_url`;
```

## 2026-05-13：card_product表新增is_saleable字段

### 变更说明
卡产品管理列表增加"是否销售"属性，值为1（是）和0（否），前端展示"是"/"否"，数据库存1/0。当前数据库统一值为0。

### 执行SQL

```sql
ALTER TABLE `card_product` ADD COLUMN `is_saleable` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否销售: 1-是, 0-否' AFTER `is_hot`;
```

### 回滚SQL

```sql
ALTER TABLE `card_product` DROP COLUMN `is_saleable`;
```

## 2026-05-13：card_product表新增is_hot字段

### 变更说明
卡产品管理列表增加"是否热门"属性，值为1（是）和0（否），前端展示"是"/"否"，数据库存1/0。当前数据库统一值为0。

### 执行SQL

```sql
ALTER TABLE `card_product` ADD COLUMN `is_hot` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否热门: 1-是, 0-否' AFTER `status`;
```

### 回滚SQL

```sql
ALTER TABLE `card_product` DROP COLUMN `is_hot`;
```

## 2026-05-11：收卡和卖卡折扣率分离

### 变更说明
将 `card_type` 表的 `discount_rate` 字段拆分为两个独立的折扣率：
- `discount_rate`：收卡折扣率（回收时使用，原字段）
- `buy_discount_rate`：卖卡折扣率（购买时使用，新增字段）

### 执行SQL

```sql
-- 新增卖卡折扣率字段，默认值与收卡折扣率一致
ALTER TABLE card_type
ADD COLUMN buy_discount_rate DECIMAL(3,2) NOT NULL DEFAULT 0.95 COMMENT '卖卡折扣率'
AFTER discount_rate;

-- 将现有数据的卖卡折扣率初始化为与收卡折扣率相同
UPDATE card_type SET buy_discount_rate = discount_rate WHERE buy_discount_rate = 0.95;
```

### 回滚SQL

```sql
ALTER TABLE card_type DROP COLUMN buy_discount_rate;
```

## 2026-05-13：卡产品面值数据初始化

### 变更说明
将小程序中写死的卡券面值数据写入 `card_product` 表，使面值数据由数据库统一管理。
同时更新 `card_type` 表的 `face_values` 字段，使其与小程序实际使用的面值保持一致。

### 执行SQL

```sql
-- 1. 清空旧的卡产品数据（如有）
DELETE FROM `card_product`;

-- 2. 重置自增ID
ALTER TABLE `card_product` AUTO_INCREMENT = 1;

-- 3. 插入卡产品数据（面值来源于小程序各页面实际使用的值）
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

-- 4. 更新 card_type 表的 face_values 字段，与小程序实际面值保持一致
UPDATE `card_type` SET `face_values` = '[20,30,50,100]' WHERE `id` = 1;   -- 话费充值卡
UPDATE `card_type` SET `face_values` = '[50,100,200,500,1000]' WHERE `id` = 2;   -- 加油卡
UPDATE `card_type` SET `face_values` = '[10,20,30,50,100,300,500,1000]' WHERE `id` = 3;   -- 游戏点卡
UPDATE `card_type` SET `face_values` = '[10,20,30,40,50,70,100,150,200,300,400,500,600,800,888,1000,1500,2000,3000,4000,5000]' WHERE `id` = 4;   -- 京东E卡
UPDATE `card_type` SET `face_values` = '[100,200,300,500,1000,2000]' WHERE `id` = 5;   -- 超市购物卡
UPDATE `card_type` SET `face_values` = '[30,50,100]' WHERE `id` = 6;   -- 电影票券
UPDATE `card_type` SET `face_values` = '[100,200,300,500,1000,2000]' WHERE `id` = 7;   -- 美食代金券
UPDATE `card_type` SET `face_values` = '[10,20,50,100]' WHERE `id` = 8;   -- 出行券
UPDATE `card_type` SET `face_values` = '[100,200,500,800,1000,2000,3000,4000,5000]' WHERE `id` = 9;   -- 美团企业积分
UPDATE `card_type` SET `face_values` = '[50,100,200,500]' WHERE `id` = 10;  -- 劳保积分
UPDATE `card_type` SET `face_values` = '[100,200,500,1000]' WHERE `id` = 11;  -- 携程积分
UPDATE `card_type` SET `face_values` = '[15,30,50,100]' WHERE `id` = 12;  -- 影音会员
UPDATE `card_type` SET `face_values` = '[100,200,300,500,1000,2000]' WHERE `id` = 13;  -- 电商礼品卡
```

### 回滚SQL

```sql
DELETE FROM `card_product`;
ALTER TABLE `card_product` AUTO_INCREMENT = 1;

-- 恢复 card_type 原始 face_values
UPDATE `card_type` SET `face_values` = '[10,20,30,50,100,200,300,500]' WHERE `id` = 1;
UPDATE `card_type` SET `face_values` = '[100,200,300,500,1000]' WHERE `id` = 2;
UPDATE `card_type` SET `face_values` = '[10,20,30,50,100,200]' WHERE `id` = 3;
UPDATE `card_type` SET `face_values` = '[50,100,200,500,1000]' WHERE `id` = 4;
UPDATE `card_type` SET `face_values` = '[50,100,200,500]' WHERE `id` = 5;
UPDATE `card_type` SET `face_values` = '[30,50,100]' WHERE `id` = 6;
UPDATE `card_type` SET `face_values` = '[20,50,100,200]' WHERE `id` = 7;
UPDATE `card_type` SET `face_values` = '[10,20,50,100]' WHERE `id` = 8;
UPDATE `card_type` SET `face_values` = '[100,200,500,1000]' WHERE `id` = 9;
UPDATE `card_type` SET `face_values` = '[50,100,200,500]' WHERE `id` = 10;
UPDATE `card_type` SET `face_values` = '[100,200,500,1000]' WHERE `id` = 11;
UPDATE `card_type` SET `face_values` = '[15,30,50,100]' WHERE `id` = 12;
UPDATE `card_type` SET `face_values` = '[50,100,200,500]' WHERE `id` = 13;
```


## 2026-05-14：新增card_product_face_value面值明细表

### 变更说明
将 `card_product` 表中的 `face_values`（JSON数组）、`discount_rate`、`buy_discount_rate`、`is_hot`、`is_saleable` 字段拆分到独立的 `card_product_face_value` 子表，实现每个面值拥有独立的折扣率和属性。

### 执行SQL

```sql
-- 1. 创建面值明细表
CREATE TABLE card_product_face_value (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  card_product_id INT NOT NULL COMMENT '所属卡产品ID',
  face_value DECIMAL(10,2) NOT NULL COMMENT '面值金额',
  discount_rate DECIMAL(3,2) NOT NULL DEFAULT 0.95 COMMENT '收卡折扣率',
  buy_discount_rate DECIMAL(3,2) NOT NULL DEFAULT 0.95 COMMENT '卖卡折扣率',
  is_hot TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否热门: 1-是, 0-否',
  is_saleable TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否销售: 1-是, 0-否',
  sort INT NOT NULL DEFAULT 0 COMMENT '排序',
  status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态: ACTIVE-启用, DISABLED-禁用',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_card_product_id (card_product_id),
  UNIQUE KEY uk_product_face (card_product_id, face_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='卡产品面值明细表';

-- 2. 数据迁移（已通过脚本 server/scripts/migrate-face-values.js 执行完成）
-- 迁移结果：14个有面值的卡产品，共61条面值记录

-- 3. 注意：card_product 表的 face_values, discount_rate, buy_discount_rate, is_hot, is_saleable 字段暂时保留
--    标记为"已废弃"，待确认所有功能正常后再删除
```

### 回滚SQL

```sql
-- 删除面值明细表
DROP TABLE IF EXISTS card_product_face_value;
```
