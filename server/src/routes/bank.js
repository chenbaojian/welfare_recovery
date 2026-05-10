// src/routes/bank.js - 结算账户路由
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const bankController = require('../controllers/bank');
const { auth, verified } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * 账户列表
 * GET /api/bank/list
 */
router.get('/list', auth, bankController.list);

/**
 * 添加账户
 * POST /api/bank/add
 */
router.post('/add',
  auth,
  verified,
  [
    body('bankCode').notEmpty().withMessage('银行代码不能为空'),
    body('bankName').notEmpty().withMessage('银行名称不能为空'),
    body('cardNo').notEmpty().withMessage('银行卡号不能为空'),
    body('realName').notEmpty().withMessage('持卡人姓名不能为空')
  ],
  validate,
  bankController.add
);

/**
 * 更新账户
 * PUT /api/bank/update
 */
router.put('/update',
  auth,
  [
    body('id').notEmpty().withMessage('账户ID不能为空')
  ],
  validate,
  bankController.update
);

/**
 * 删除账户
 * POST /api/bank/delete
 */
router.post('/delete',
  auth,
  [
    body('bankId').notEmpty().withMessage('账户ID不能为空')
  ],
  validate,
  bankController.delete
);

/**
 * 设置默认账户
 * POST /api/bank/setDefault
 */
router.post('/setDefault',
  auth,
  [
    body('bankId').notEmpty().withMessage('账户ID不能为空')
  ],
  validate,
  bankController.setDefault
);

module.exports = router;