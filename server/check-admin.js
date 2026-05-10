// 检查管理员账号
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'welfare_recovery'
  });

  try {
    const [rows] = await connection.execute('SELECT id, username, real_name, role, status, last_login_time, create_time FROM admin');
    
    if (rows.length === 0) {
      console.log('❌ 数据库中没有管理员账号');
    } else {
      console.log('✅ 数据库中已有管理员账号:');
      console.log('---');
      rows.forEach(admin => {
        console.log(`ID: ${admin.id}`);
        console.log(`用户名: ${admin.username}`);
        console.log(`真实姓名: ${admin.real_name}`);
        console.log(`角色: ${admin.role}`);
        console.log(`状态: ${admin.status}`);
        console.log(`最后登录: ${admin.last_login_time || '从未登录'}`);
        console.log(`创建时间: ${admin.create_time}`);
        console.log('---');
      });
    }
  } catch (err) {
    console.error('❌ 查询失败:', err.message);
    console.log('\n请确保:');
    console.log('1. MySQL 服务已启动');
    console.log('2. 数据库已创建 (运行 database/init.sql)');
    console.log('3. .env 文件中的数据库配置正确');
  } finally {
    await connection.end();
  }
}

checkAdmin();