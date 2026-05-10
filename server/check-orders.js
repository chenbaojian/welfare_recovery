require('dotenv').config();
const { Sequelize } = require('sequelize');

// 连接 welfare_recycle 数据库
const sequelizeRecycle = new Sequelize(
  'welfare_recycle',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

async function checkOrders() {
  try {
    // 检查 welfare_recycle 数据库中的表
    const [tables] = await sequelizeRecycle.query('SHOW TABLES');
    console.log('welfare_recycle 数据库中的表:', tables);

    // 检查订单数量
    const [orderResults] = await sequelizeRecycle.query('SELECT COUNT(*) as count FROM `order`');
    console.log('welfare_recycle 订单数量:', orderResults[0].count);

    // 检查用户数量
    const [userResults] = await sequelizeRecycle.query('SELECT COUNT(*) as count FROM `user`');
    console.log('welfare_recycle 用户数量:', userResults[0].count);

    // 查看订单数据
    const [orders] = await sequelizeRecycle.query('SELECT * FROM `order` LIMIT 5');
    console.log('welfare_recycle 订单数据:', orders);

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await sequelizeRecycle.close();
  }
}

checkOrders();