// src/routes/common.js - 公共路由
const express = require('express');
const router = express.Router();
const multer = require('multer');

const commonController = require('../controllers/common');
const { auth } = require('../middleware/auth');

// 文件上传配置
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

/**
 * 文件上传
 * POST /api/common/upload
 */
router.post('/upload', auth, upload.single('file'), commonController.upload);

/**
 * 获取配置
 * GET /api/common/config
 */
router.get('/config', commonController.getConfig);

/**
 * 意见反馈
 * POST /api/common/feedback
 */
router.post('/feedback', auth, commonController.feedback);

module.exports = router;