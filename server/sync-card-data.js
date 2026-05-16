/**
 * 迁移脚本：将小程序硬编码的卡券数据写入数据库
 * 忽略已存在的记录（按 name 去重）
 * 
 * 使用方式：node sync-card-data.js
 */
require('dotenv').config();
const { sequelize } = require('./src/config/database');
const CardType = require('./src/models/CardType');
const CardProduct = require('./src/models/CardProduct');

// 小程序硬编码的完整卡券数据（与 index.js CARD_TYPES_DATA 对齐）
// discount 字段对应数据库的 discount_rate（收卡折扣率）
// 小程序没有 buy_discount_rate，统一使用与 discount_rate 相同的值
const MINI_PROGRAM_DATA = [
  {
    name: '电话卡',
    category: 'telecom',
    discount: 0.98,
    description: '支持移动/联通/电信',
    icon: '📱',
    isHot: true,
    faceValues: [10, 20, 30, 50, 100, 200, 300, 500],
    children: []
  },
  {
    name: '加油卡',
    category: 'travel',
    discount: 0.95,
    description: '中石化/中石油加油卡',
    icon: '⛽',
    isHot: true,
    faceValues: [100, 200, 300, 500, 1000],
    children: []
  },
  {
    name: '游戏卡',
    category: 'entertainment',
    discount: 0.90,
    description: '网易一卡通等',
    icon: '🎮',
    isHot: false,
    faceValues: [10, 20, 30, 50, 100, 200],
    children: [
      { name: '网易一卡通', discount: 0.90, faceValues: [10, 20, 30, 50, 100, 200] }
    ]
  },
  {
    name: '影音券',
    category: 'entertainment',
    discount: 0.80,
    description: '爱奇艺/腾讯视频等',
    icon: '🎵',
    isHot: false,
    faceValues: [15, 30, 50, 100],
    children: [
      { name: '爱奇艺会员', discount: 0.80, faceValues: [15, 30, 50, 100] },
      { name: '腾讯视频会员', discount: 0.80, faceValues: [15, 30, 50, 100] },
      { name: '优酷视频会员', discount: 0.80, faceValues: [15, 30, 50, 100] },
      { name: '芒果TV会员', discount: 0.80, faceValues: [15, 30, 50, 100] },
      { name: '京东电影', discount: 0.80, faceValues: [30, 50, 100] },
      { name: '喜马拉雅FM', discount: 0.80, faceValues: [15, 30, 50, 100] }
    ]
  },
  {
    name: '电商卡',
    category: 'ecommerce',
    discount: 0.97,
    description: '京东超市卡/永辉超市卡等',
    icon: '🛒',
    isHot: true,
    faceValues: [50, 100, 200, 500],
    children: [
      { name: '京东超市卡', discount: 0.97, faceValues: [50, 100, 200, 500] },
      { name: '永辉超市卡', discount: 0.97, faceValues: [50, 100, 200, 500] },
      { name: '美团礼品卡', discount: 0.97, faceValues: [50, 100, 200, 500] },
      { name: '天猫超市卡', discount: 0.97, faceValues: [50, 100, 200, 500] },
      { name: '银泰百货银泰卡', discount: 0.97, faceValues: [50, 100, 200, 500] },
      { name: '苏宁易购礼品卡', discount: 0.97, faceValues: [50, 100, 200, 500] },
      { name: '中百超市购物卡', discount: 0.97, faceValues: [50, 100, 200, 500] }
    ]
  },
  {
    name: '京东E卡',
    category: 'ecommerce',
    discount: 0.97,
    description: '京东E卡',
    icon: '📦',
    isHot: false,
    faceValues: [50, 100, 200, 500, 1000],
    children: []
  },
  {
    name: '商超卡',
    category: 'life',
    discount: 0.92,
    description: '沃尔玛卡/盒马生鲜等',
    icon: '🏪',
    isHot: false,
    faceValues: [50, 100, 200, 500],
    children: [
      { name: '盒马生鲜', discount: 0.92, faceValues: [50, 100, 200, 500] },
      { name: '朴朴超市', discount: 0.92, faceValues: [50, 100, 200, 500] },
      { name: '小象超市', discount: 0.92, faceValues: [50, 100, 200, 500] },
      { name: '红旗连锁', discount: 0.92, faceValues: [50, 100, 200, 500] }
    ]
  },
  {
    name: '美食券',
    category: 'life',
    discount: 0.88,
    description: '瑞幸咖啡/肯德基等',
    icon: '🍔',
    isHot: false,
    faceValues: [20, 50, 100, 200],
    children: [
      { name: '瑞幸咖啡', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '肯德基', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '爱达乐', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '好利来', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '霸王茶姬', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '味多美', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '元祖食品', discount: 0.88, faceValues: [20, 50, 100, 200] },
      { name: '星巴克', discount: 0.88, faceValues: [20, 50, 100, 200] }
    ]
  },
  {
    name: '美团企业积分',
    category: 'points',
    discount: 0.75,
    description: '美团企业积分',
    icon: '🎁',
    isHot: false,
    faceValues: [100, 200, 500, 1000],
    children: []
  },
  {
    name: '劳保积分',
    category: 'points',
    discount: 0.70,
    description: '劳保福利积分',
    icon: '💼',
    isHot: false,
    faceValues: [50, 100, 200, 500],
    children: []
  },
  {
    name: '出行券',
    category: 'travel',
    discount: 0.72,
    description: '融晟携程卡包/携程积分',
    icon: '🚗',
    isHot: false,
    faceValues: [10, 20, 50, 100],
    children: [
      { name: '融晟携程卡包', discount: 0.72, faceValues: [10, 20, 50, 100] },
      { name: '携程积分', discount: 0.72, faceValues: [100, 200, 500, 1000] }
    ]
  }
];

// 数据库已有类型名 → 小程序类型名的映射
// 数据库中的名称与小程序不完全一致，需要映射
const TYPE_NAME_MAP = {
  '话费充值卡': '电话卡',
  '加油卡': '加油卡',
  '游戏点卡': '游戏卡',
  '京东E卡': '京东E卡',
  '超市购物卡': '商超卡',
  '电影票券': '电影票券',       // 数据库有，小程序没有独立类型
  '美食代金券': '美食券',
  '出行券': '出行券',
  '美团企业积分': '美团企业积分',
  '劳保积分': '劳保积分',
  '携程积分': '携程积分',       // 数据库是独立类型，小程序是出行券的子项
  '影音会员': '影音券',
  '电商礼品卡': '电商卡'
};

async function syncCardData() {
  try {
    console.log('=== 开始同步小程序卡券数据到数据库 ===\n');

    // 1. 获取数据库已有数据
    const existingTypes = await CardType.findAll({ raw: true });
    const existingProducts = await CardProduct.findAll({ raw: true });

    const existingTypeNames = new Set(existingTypes.map(t => t.name));
    const existingProductKeys = new Set(
      existingProducts.map(p => `${p.cardTypeId}:${p.name}`)
    );

    console.log(`数据库已有 card_type: ${existingTypes.length} 条`);
    console.log(`数据库已有 card_product: ${existingProducts.length} 条\n`);

    // 2. 构建"数据库类型名 → 数据库id"的映射
    const dbTypeNameToId = {};
    existingTypes.forEach(t => { dbTypeNameToId[t.name] = t.id; });

    // 3. 同步 card_type
    let newTypeCount = 0;
    const typeNameToId = {}; // 小程序类型名 → 数据库id

    for (const item of MINI_PROGRAM_DATA) {
      // 检查是否已存在（通过映射或直接名称匹配）
      let dbId = null;
      for (const [dbName, miniName] of Object.entries(TYPE_NAME_MAP)) {
        if (miniName === item.name && dbTypeNameToId[dbName]) {
          dbId = dbTypeNameToId[dbName];
          break;
        }
      }

      if (dbId) {
        // 已存在，记录映射
        typeNameToId[item.name] = dbId;
        console.log(`[跳过] card_type "${item.name}" 已存在 (id=${dbId})`);
      } else {
        // 不存在，新增
        const newType = await CardType.create({
          name: item.name,
          category: item.category,
          description: item.description,
          icon: item.icon,
          discount_rate: item.discount,
          buy_discount_rate: item.discount,
          face_values: item.faceValues,
          is_hot: item.isHot ? 1 : 0,
          sort: 0,
          status: 'ACTIVE'
        });
        typeNameToId[item.name] = newType.id;
        newTypeCount++;
        console.log(`[新增] card_type "${item.name}" (id=${newType.id})`);
      }
    }

    console.log(`\ncard_type 新增: ${newTypeCount} 条\n`);

    // 4. 同步 card_product
    let newProductCount = 0;

    for (const item of MINI_PROGRAM_DATA) {
      const cardTypeId = typeNameToId[item.name];
      if (!cardTypeId) {
        console.log(`[警告] 未找到类型 "${item.name}" 的数据库ID，跳过其子项`);
        continue;
      }

      for (let i = 0; i < item.children.length; i++) {
        const child = item.children[i];
        const productKey = `${cardTypeId}:${child.name}`;

        if (existingProductKeys.has(productKey)) {
          console.log(`[跳过] card_product "${child.name}" (type_id=${cardTypeId}) 已存在`);
          continue;
        }

        // 检查数据库中是否已有同名产品（避免重复）
        const existing = await CardProduct.findOne({
          where: { cardTypeId, name: child.name }
        });

        if (existing) {
          existingProductKeys.add(productKey);
          console.log(`[跳过] card_product "${child.name}" (type_id=${cardTypeId}) 已存在`);
          continue;
        }

        await CardProduct.create({
          cardTypeId,
          name: child.name,
          face_values: child.faceValues,
          discount_rate: child.discount,
          buy_discount_rate: child.discount,
          sort: i + 1,
          status: 'ACTIVE'
        });
        newProductCount++;
        console.log(`[新增] card_product "${child.name}" (type_id=${cardTypeId})`);
      }
    }

    console.log(`\ncard_product 新增: ${newProductCount} 条`);
    console.log('\n=== 同步完成 ===');

    // 5. 打印最终统计
    const finalTypes = await CardType.findAll({ raw: true });
    const finalProducts = await CardProduct.findAll({ raw: true });
    console.log(`\n最终统计: card_type ${finalTypes.length} 条, card_product ${finalProducts.length} 条`);

  } catch (err) {
    console.error('同步失败:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

syncCardData();
