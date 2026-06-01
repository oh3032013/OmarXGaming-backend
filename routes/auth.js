import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cyberpunk_neon_gaming_key_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'OmarXGaming2026';

// تسجيل الدخول للأدمن
router.post('/login', (req, res) => {
  const { password } = req.body;

  // 1. التحقق من وجود كلمة المرور
  if (!password) {
    return res.status(400).json({ 
      success: false, 
      message: req.t('password_required') // ترجمة ديناميكية
    });
  }

  // 2. التحقق من تطابق كلمة المرور
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ 
      success: false, 
      message: req.t('incorrect_password') // ترجمة ديناميكية
    });
  }

  // إنشاء التوكن (JWT) صالح لمدة 24 ساعة
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

  // 3. نجاح تسجيل الدخول
  return res.json({
    success: true,
    message: req.t('login_success'), // ترجمة ديناميكية
    token
  });
});

export default router;