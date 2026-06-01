import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cyberpunk_neon_gaming_key_2026';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'غير مصرح بالدخول: لم يتم توفير التوكن.' });
  }

  // التوكن يجب أن يكون بصيغة: Bearer <token>
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح بالدخول: صيغة التوكن غير صحيحة.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'جلسة العمل انتهت أو غير صالحة. يرجى تسجيل الدخول مجدداً.' });
  }
};
