// src/utils/crypto.js - 加密工具
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// AES-256 需要32字节密钥，对 CRYPTO_KEY 进行填充/截断确保长度正确
const rawKey = process.env.CRYPTO_KEY || 'default-crypto-key-32-bytes!!';
const KEY = crypto.createHash('sha256').update(rawKey).digest(); // 固定输出32字节

/**
 * 加密
 */
exports.encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * 解密
 */
exports.decrypt = (encryptedText) => {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * MD5哈希
 */
exports.md5 = (text) => {
  return crypto.createHash('md5').update(text).digest('hex');
};

/**
 * SHA256哈希
 */
exports.sha256 = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};