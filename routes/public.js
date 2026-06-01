import express from 'express';
import { readData, writeData } from '../data/db.js';

import fs from 'fs';
import path from 'path';

const router = express.Router();
const dbPath = path.resolve('db.json');

// [GET] جلب جميع المشاريع للزوار -> /api/public/projects
router.get('/projects', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db.projects || []);
  } catch (error) {
    res.status(500).json({ success: false, message: 'تعذر قراءة المشاريع' });
  }
});

// 1. جلب إحصائيات القناة
router.get('/stats', (req, res) => {
  try {
    const data = readData();
    res.json({ success: true, stats: data.stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الإحصائيات.' });
  }
});

// 2. جلب الفيديوهات
router.get('/videos', (req, res) => {
  try {
    const data = readData();
    res.json({ success: true, videos: data.videos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الفيديوهات.' });
  }
});

// 3. جلب جميع البيانات العامة دفعة واحدة لتسريع تحميل الموقع
router.get('/all', (req, res) => {
  try {
    const data = readData();
    res.json({
      success: true,
      stats: data.stats || { subscribers: 0, views: 0, videos: 0 },
      videos: data.videos || [],
      settings: data.settings || {},
      socials: data.socials || {},
      faqs: data.faqs || [],
      schedule: data.schedule || [],
      gear: data.gear || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب بيانات الموقع.' });
  }
});

// 4. إرسال رسالة من نموذج الاتصال (Sponsors & Business)
router.post('/contact', (req, res) => {
  try {
    const { name, email, company, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، الرسالة).' });
    }

    const data = readData();
    
    // إنشاء رسالة جديدة بمعرف فريد وتوقيت الإرسال
    const newMessage = {
      id: Date.now().toString(),
      name,
      email,
      company: company || 'جهة فردية',
      message,
      createdAt: new Date().toISOString(),
      read: false // افتراضي غير مقروءة للفرز
    };

    if (!data.messages) data.messages = [];
    data.messages.push(newMessage);
    writeData(data);

    res.json({ success: true, message: 'تم إرسال رسالتك بنجاح! سيقوم عمر بالتواصل معك قريباً 🚀' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ رسالتك. يرجى المحاولة لاحقاً.' });
  }
});


router.get('/portfolio', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(path.resolve('db.json'), 'utf8'));
        res.json(db.portfolio || []);
    } catch (error) {
        res.status(500).json({ success: false, message: 'تعذر جلب البيانات' });
    }
});

export default router;
