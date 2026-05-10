-- 修复脚本：清理 Sequelize sync({alter:true}) 反复执行导致的重复索引
-- 使用方法：mysql -u root -p welfare_recovery < fix_indexes.sql

USE welfare_recovery;

-- 1. 查看当前各表的索引数量
SELECT TABLE_NAME, COUNT(*) AS index_count 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'welfare_recovery' 
GROUP BY TABLE_NAME 
ORDER BY index_count DESC;

-- 2. 删除 user 表的重复索引（只保留 init.sql 中定义的）
-- 先查看 user 表所有索引
SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'welfare_recovery' AND TABLE_NAME = 'user' 
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 删除 Sequelize 自动生成的重复索引（保留 PRIMARY, uk_open_id, uk_phone, uk_id_card）
-- Sequelize 生成的索引名通常以字段名命名，如 open_id, phone, id_card 等
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_2`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_2`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_2`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_3`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_3`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_3`;
-- 继续删除更多可能的重复索引（Sequelize alter 可能生成了很多）
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_4`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_4`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_4`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_5`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_5`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_5`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_6`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_6`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_6`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_7`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_7`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_7`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_8`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_8`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_8`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_9`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_9`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_9`;
ALTER TABLE `user` DROP INDEX IF EXISTS `open_id_10`;
ALTER TABLE `user` DROP INDEX IF EXISTS `phone_10`;
ALTER TABLE `user` DROP INDEX IF EXISTS `id_card_10`;

-- 3. 删除 order 表的重复索引（保留 PRIMARY, uk_order_no, idx_user_id, idx_status, idx_create_time）
ALTER TABLE `order` DROP INDEX IF EXISTS `order_no`;
ALTER TABLE `order` DROP INDEX IF EXISTS `user_id`;
ALTER TABLE `order` DROP INDEX IF EXISTS `status`;
ALTER TABLE `order` DROP INDEX IF EXISTS `create_time`;
ALTER TABLE `order` DROP INDEX IF EXISTS `order_no_2`;
ALTER TABLE `order` DROP INDEX IF EXISTS `user_id_2`;
ALTER TABLE `order` DROP INDEX IF EXISTS `status_2`;
ALTER TABLE `order` DROP INDEX IF EXISTS `create_time_2`;
ALTER TABLE `order` DROP INDEX IF EXISTS `order_no_3`;
ALTER TABLE `order` DROP INDEX IF EXISTS `user_id_3`;
ALTER TABLE `order` DROP INDEX IF EXISTS `status_3`;
ALTER TABLE `order` DROP INDEX IF EXISTS `create_time_3`;
ALTER TABLE `order` DROP INDEX IF EXISTS `order_no_4`;
ALTER TABLE `order` DROP INDEX IF EXISTS `user_id_4`;
ALTER TABLE `order` DROP INDEX IF EXISTS `status_4`;
ALTER TABLE `order` DROP INDEX IF EXISTS `create_time_4`;
ALTER TABLE `order` DROP INDEX IF EXISTS `order_no_5`;
ALTER TABLE `order` DROP INDEX IF EXISTS `user_id_5`;
ALTER TABLE `order` DROP INDEX IF EXISTS `status_5`;
ALTER TABLE `order` DROP INDEX IF EXISTS `create_time_5`;

-- 4. 删除 withdraw 表的重复索引（保留 PRIMARY, uk_withdraw_no, idx_user_id, idx_status）
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `withdraw_no`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `user_id`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `status`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `withdraw_no_2`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `user_id_2`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `status_2`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `withdraw_no_3`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `user_id_3`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `status_3`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `withdraw_no_4`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `user_id_4`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `status_4`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `withdraw_no_5`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `user_id_5`;
ALTER TABLE `withdraw` DROP INDEX IF EXISTS `status_5`;

-- 5. 删除 admin 表的重复索引（保留 PRIMARY, uk_username）
ALTER TABLE `admin` DROP INDEX IF EXISTS `username`;
ALTER TABLE `admin` DROP INDEX IF EXISTS `username_2`;
ALTER TABLE `admin` DROP INDEX IF EXISTS `username_3`;
ALTER TABLE `admin` DROP INDEX IF EXISTS `username_4`;
ALTER TABLE `admin` DROP INDEX IF EXISTS `username_5`;

-- 6. 删除 bank 表的重复索引（保留 PRIMARY, idx_user_id）
ALTER TABLE `bank` DROP INDEX IF EXISTS `user_id`;
ALTER TABLE `bank` DROP INDEX IF EXISTS `user_id_2`;
ALTER TABLE `bank` DROP INDEX IF EXISTS `user_id_3`;
ALTER TABLE `bank` DROP INDEX IF EXISTS `user_id_4`;
ALTER TABLE `bank` DROP INDEX IF EXISTS `user_id_5`;

-- 7. 删除 balance_log 表的重复索引（保留 PRIMARY, idx_user_id, idx_order_id, idx_type）
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `user_id`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `order_id`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `type`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `user_id_2`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `order_id_2`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `type_2`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `user_id_3`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `order_id_3`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `type_3`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `user_id_4`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `order_id_4`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `type_4`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `user_id_5`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `order_id_5`;
ALTER TABLE `balance_log` DROP INDEX IF EXISTS `type_5`;

-- 8. 最终验证：查看各表索引数量
SELECT TABLE_NAME, COUNT(*) AS index_count 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'welfare_recovery' 
GROUP BY TABLE_NAME 
ORDER BY index_count DESC;