/**
 * 数据迁移脚本：将 card_product.face_values 展开为 card_product_face_value 子表行
 * 用法：node scripts/migrate-face-values.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sequelize = require('../src/config/database');
const CardProduct = require('../src/models/CardProduct');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    const products = await CardProduct.findAll();
    console.log(`共 ${products.length} 个卡产品需要迁移`);

    let totalInserted = 0;

    for (const product of products) {
      const faceValues = product.faceValues || [];
      if (faceValues.length === 0) {
        console.log(`  卡产品[id=${product.id}, name=${product.name}] 无面值数据，跳过`);
        continue;
      }

      for (let i = 0; i < faceValues.length; i++) {
        const fv = faceValues[i];
        await sequelize.query(
          `INSERT INTO card_product_face_value (card_product_id, face_value, discount_rate, buy_discount_rate, is_hot, is_saleable, sort, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE discount_rate = VALUES(discount_rate), buy_discount_rate = VALUES(buy_discount_rate), is_hot = VALUES(is_hot), is_saleable = VALUES(is_saleable), sort = VALUES(sort), status = VALUES(status)`,
          {
            replacements: [
              product.id,
              fv,
              product.discountRate || 0.95,
              product.buyDiscountRate || 0.95,
              product.isHot || 0,
              product.isSaleable != null ? product.isSaleable : 1,
              i,
              product.status || 'ACTIVE'
            ]
          }
        );
        totalInserted++;
      }
      console.log(`  卡产品[id=${product.id}, name=${product.name}] 迁移 ${faceValues.length} 个面值`);
    }

    console.log(`\n迁移完成！共插入 ${totalInserted} 条面值记录`);

    // 验证
    const [results] = await sequelize.query('SELECT card_product_id, COUNT(*) as cnt FROM card_product_face_value GROUP BY card_product_id ORDER BY card_product_id');
    console.log('\n验证结果：');
    results.forEach(r => console.log(`  card_product_id=${r.card_product_id}, 面值数量=${r.cnt}`));

    process.exit(0);
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  }
}

migrate();
