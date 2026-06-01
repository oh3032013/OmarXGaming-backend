import express from 'express';
import { readData, writeData } from '../data/db.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// [GET] جلب جميع المشاريع للواجهة الأمامية
router.get('/projects', (req, res) => {
  try {
    const data = readData();
    const projects = data.projects || [];
    res.json(projects);
  } catch (error) {
    res.status(500).json({ success: false, message: 'تعذر قراءة المشاريع' });
  }
});

// [GET] مسار /portfolio للتوافق مع الواجهة
router.get('/portfolio', (req, res) => {
  try {
    const data = readData();
    const projects = data.projects || [];
    res.json(projects);
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

// 3. جلب جميع البيانات العامة دفعة واحدة
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

// 4. إرسال رسالة من نموذج الاتصال
router.post('/contact', (req, res) => {
  try {
    const { name, email, company, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، الرسالة).' });
    }

    const data = readData();
    
    const newMessage = {
      id: Date.now().toString(),
      name,
      email,
      company: company || 'جهة فردية',
      message,
      createdAt: new Date().toISOString(),
      read: false
    };

    if (!data.messages) data.messages = [];
    data.messages.push(newMessage);
    writeData(data);

    res.json({ success: true, message: 'تم إرسال رسالتك بنجاح! سيقوم عمر بالتواصل معك قريباً 🚀' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ رسالتك. يرجى المحاولة لاحقاً.' });
  }
});

export default router;