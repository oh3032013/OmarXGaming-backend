import express from 'express';
import { readData, writeData } from '../data/db.js';
import { verifyToken } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { upload } from '../middleware/upload.js';

const router = express.Router();
const dbPath = path.resolve('db.json');

// [POST] إضافة مشروع جديد ببيانات كاملة وملف ميديا
router.post('/portfolio', upload.single('media'), (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!db.portfolio) db.portfolio = [];

        const newItem = {
            id: 'oxg-' + Date.now(),
            title: req.body.title || '',
            description: req.body.description || '',
            notes: req.body.notes || '', // الملاحظات الإضافية
            link: req.body.link || '#',
            type: req.file ? (req.file.mimetype.startsWith('video') ? 'video' : 'image') : 'none',
            url: req.file ? `/portfolio/${req.file.filename}` : '',
            createdAt: new Date().toISOString()
        };

        db.portfolio.push(newItem);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
        res.status(201).json({ success: true, message: 'تم إضافة المشروع بنجاح! 🚀', item: newItem });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ المشروع' });
    }
});

// [DELETE] حذف مشروع وملفه الفعلي
router.delete('/portfolio/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        const index = db.portfolio.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });

        const item = db.portfolio[index];
        if (item.url) {
            const filePath = path.join('./public', item.url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        db.portfolio.splice(index, 1);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
        res.json({ success: true, message: 'تم الحذف بنجاح 🗑️' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'تعذر الحذف' });
    }
});

// تطبيق الحماية (verifyToken) على جميع المسارات التالية تلقائياً
router.use(verifyToken);

// 1. جلب الإحصائيات الحالية للتعديل
router.get('/stats', (req, res) => {
  const data = readData();
  res.json({ success: true, stats: data.stats });
});

// 2. تحديث الإحصائيات
router.put('/stats', (req, res) => {
  try {
    const { subscribers, views, videos } = req.body;
    
    if (subscribers === undefined || views === undefined || videos === undefined) {
      return res.status(400).json({ success: false, message: 'يرجى إرسال جميع الإحصائيات المطلوبة.' });
    }

    const data = readData();
    data.stats = {
      subscribers: parseInt(subscribers, 10) || 0,
      views: parseInt(views, 10) || 0,
      videos: parseInt(videos, 10) || 0
    };

    writeData(data);
    res.json({ success: true, message: 'تم تحديث الإحصائيات بنجاح! 🎯', stats: data.stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث الإحصائيات.' });
  }
});

// 3. جلب قائمة الفيديوهات الحالية للتعديل
router.get('/videos', (req, res) => {
  const data = readData();
  res.json({ success: true, videos: data.videos });
});

// 4. تحديث قائمة الفيديوهات بالكامل (ترتيب/تعديل)
router.put('/videos', (req, res) => {
  try {
    const { videos } = req.body;

    if (!Array.isArray(videos)) {
      return res.status(400).json({ success: false, message: 'يجب توفير مصفوفة للفيديوهات.' });
    }

    const data = readData();
    data.videos = videos.map((v, index) => ({
      id: v.id || index + 1,
      youtubeId: (v.youtubeId || '').trim(),
      title: (v.title || '').trim(),
      description: (v.description || '').trim()
    }));

    writeData(data);
    res.json({ success: true, message: 'تم تحديث الفيديوهات بنجاح! 🎬', videos: data.videos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث الفيديوهات.' });
  }
});

// 4.ب. إضافة فيديو جديد (Dynamic CRUD)
router.post('/videos', (req, res) => {
  try {
    const { youtubeId, title, description } = req.body;

    if (!youtubeId || !title) {
      return res.status(400).json({ success: false, message: 'يرجى ملء معرف الفيديو والعنوان.' });
    }

    const data = readData();
    if (!data.videos) data.videos = [];

    const newVideo = {
      id: Date.now(), // معرف فريد معتمد على التوقيت
      youtubeId: youtubeId.trim(),
      title: title.trim(),
      description: (description || '').trim()
    };

    data.videos.push(newVideo);
    writeData(data);

    res.json({ success: true, message: 'تمت إضافة الفيديو الجديد بنجاح! 🚀🎬', videos: data.videos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة الفيديو.' });
  }
});

// 4.ج. حذف فيديو معين (Dynamic CRUD)
router.delete('/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();

    const index = data.videos.findIndex(v => v.id.toString() === id.toString() || v.id === parseInt(id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'الفيديو المطلوب غير موجود.' });
    }

    data.videos.splice(index, 1);
    writeData(data);

    res.json({ success: true, message: 'تم حذف الفيديو بنجاح! 🗑️', videos: data.videos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف الفيديو.' });
  }
});

// 5. جلب الإعدادات والروابط والعتاد بالكامل للإدارة
router.get('/all-settings', (req, res) => {
  const data = readData();
  res.json({
    success: true,
    settings: data.settings || {},
    socials: data.socials || {},
    faqs: data.faqs || [],
    schedule: data.schedule || [],
    gear: data.gear || []
  });
});

// 6. تحديث إعدادات الواجهة والـ SEO
router.put('/settings', (req, res) => {
  try {
    const { channelHandle, heroTitle, heroSubtitle, heroDescription, themeColor, soundEnabled, customCursorEnabled } = req.body;
    const data = readData();

    data.settings = {
      channelHandle: (channelHandle || data.settings.channelHandle || '').trim(),
      heroTitle: (heroTitle || data.settings.heroTitle || '').trim(),
      heroSubtitle: (heroSubtitle || data.settings.heroSubtitle || '').trim(),
      heroDescription: (heroDescription || data.settings.heroDescription || '').trim(),
      themeColor: themeColor || data.settings.themeColor || 'cyberpunk',
      soundEnabled: soundEnabled !== undefined ? soundEnabled : true,
      customCursorEnabled: customCursorEnabled !== undefined ? customCursorEnabled : true
    };

    writeData(data);
    res.json({ success: true, message: 'تم حفظ الإعدادات العامة بنجاح! ⚙️', settings: data.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الإعدادات.' });
  }
});

// 7. تحديث روابط التواصل الاجتماعي (Social Links)
router.put('/socials', (req, res) => {
  try {
    const { youtube, discord, tiktok, twitter, instagram } = req.body;
    const data = readData();

    data.socials = {
      youtube: (youtube || '').trim(),
      discord: (discord || '').trim(),
      tiktok: (tiktok || '').trim(),
      twitter: (twitter || '').trim(),
      instagram: (instagram || '').trim()
    };

    writeData(data);
    res.json({ success: true, message: 'تم تحديث روابط التواصل بنجاح! 🔗', socials: data.socials });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث الروابط.' });
  }
});

// 8. تحديث الأسئلة الشائعة (FAQ)
router.put('/faqs', (req, res) => {
  try {
    const { faqs } = req.body;
    if (!Array.isArray(faqs)) {
      return res.status(400).json({ success: false, message: 'صيغة الأسئلة غير صحيحة.' });
    }

    const data = readData();
    data.faqs = faqs;
    writeData(data);

    res.json({ success: true, message: 'تم تحديث الأسئلة الشائعة بنجاح! ❓', faqs: data.faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث الأسئلة الشائعة.' });
  }
});

// 9. تحديث جدول البث المباشر (Stream Schedule)
router.put('/schedule', (req, res) => {
  try {
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ success: false, message: 'صيغة جدول البث غير صحيحة.' });
    }

    const data = readData();
    data.schedule = schedule;
    writeData(data);

    res.json({ success: true, message: 'تم تحديث جدول البث بنجاح! 📅', schedule: data.schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث جدول البث.' });
  }
});

// 10. تحديث مواصفات عتاد الجيمينج (Gear Specs)
router.put('/gear', (req, res) => {
  try {
    const { gear } = req.body;
    if (!Array.isArray(gear)) {
      return res.status(400).json({ success: false, message: 'صيغة العتاد غير صحيحة.' });
    }

    const data = readData();
    data.gear = gear;
    writeData(data);

    res.json({ success: true, message: 'تم تحديث عتاد الجيمينج بنجاح! 🚀', gear: data.gear });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث عتاد الجيمينج.' });
  }
});

// 11. استعراض صندوق الرسائل
router.get('/messages', (req, res) => {
  try {
    const data = readData();
    const sortedMessages = [...data.messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, messages: sortedMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الرسائل.' });
  }
});

// 12. وضع علامة مقروءة على الرسالة (Read Status Toggle)
router.put('/messages/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();

    const msg = data.messages.find(m => m.id === id);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'الرسالة غير موجودة.' });
    }

    msg.read = true;
    writeData(data);

    res.json({ success: true, message: 'تم وضع علامة مقروءة على الرسالة.', messages: data.messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث الرسالة.' });
  }
});

// 13. حذف رسالة معينة
router.delete('/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    
    const messageIndex = data.messages.findIndex(m => m.id === id);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, message: 'الرسالة غير موجودة.' });
    }

    data.messages.splice(messageIndex, 1);
    writeData(data);

    res.json({ success: true, message: 'تم حذف الرسالة بنجاح.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف الرسالة.' });
  }
});

// 14. المزامنة التلقائية مع يوتيوب (Sync Latest 6 Videos)
router.post('/youtube/sync', async (req, res) => {
  try {
    const data = readData();
    const handle = data.settings?.channelHandle || '@omarxgaming123';
    const channelUrl = `https://www.youtube.com/${handle}`;

    const channelRes = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!channelRes.ok) {
      return res.status(400).json({ success: false, message: `فشل الاتصال بقناة يوتيوب ${handle}` });
    }

    const html = await channelRes.text();
    
    let channelId = null;
    const matchChannelId = html.match(/"channelId"\s*:\s*"(UC[^"]+)"/);
    if (matchChannelId) {
      channelId = matchChannelId[1];
    } else {
      const matchBrowseId = html.match(/"browseId"\s*:\s*"(UC[^"]+)"/);
      if (matchBrowseId) {
        channelId = matchBrowseId[1];
      } else {
        const matchMeta = html.match(/<meta itemprop="channelId" content="(UC[^"]+)"/);
        if (matchMeta) {
          channelId = matchMeta[1];
        }
      }
    }

    if (!channelId) {
      return res.status(400).json({ success: false, message: 'تعذر استخراج معرف القناة من يوتيوب تلقائياً. يرجى إدخال الفيديوهات يدوياً.' });
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssRes = await fetch(rssUrl);
    
    if (!rssRes.ok) {
      return res.status(400).json({ success: false, message: 'فشل جلب قائمة الفيديوهات من تغذية يوتيوب RSS.' });
    }

    const xml = await rssRes.text();
    
    const syncedVideos = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null && syncedVideos.length < 12) { // سحب حتى 12 فيديو لمزيد من الخيارات
      const entryHtml = match[1];
      
      const videoIdMatch = entryHtml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const videoId = videoIdMatch ? videoIdMatch[1].trim() : '';

      const titleMatch = entryHtml.match(/<title>([^<]+)<\/title>/);
      let title = titleMatch ? titleMatch[1].trim() : '';
      title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

      const descMatch = entryHtml.match(/<media:description>([^<]*?)<\/media:description>/);
      let description = descMatch ? descMatch[1].trim() : '';
      description = description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      
      if (description.length > 130) {
        description = description.substring(0, 127) + '...';
      }

      if (videoId && title) {
        syncedVideos.push({
          id: Date.now() + syncedVideos.length,
          youtubeId: videoId,
          title,
          description: description || 'شاهد هذا الفيديو الحماسي والمميز على قناة OmarXGaming!'
        });
      }
    }

    if (syncedVideos.length === 0) {
      return res.status(400).json({ success: false, message: 'لم يتم العثور على أي فيديوهات في القناة للمزامنة.' });
    }

    // حفظ الفيديوهات المسحوبة بالكامل
    data.videos = syncedVideos;
    writeData(data);

    res.json({ 
      success: true, 
      message: `تمت المزامنة وجلب أحدث ${syncedVideos.length} فيديوهات من قناتك بنجاح! 🎬✨`,
      videos: data.videos 
    });

  } catch (error) {
    console.error('YouTube Sync Error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ غير متوقع أثناء محاولة مزامنة قناة يوتيوب.' });
  }
});

export default router;
