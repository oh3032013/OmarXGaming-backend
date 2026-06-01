import express from 'express';
import { readData, writeData } from '../data/db.js';
import { verifyToken } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = express.Router();
const dbPath = path.resolve('db.json');

// ============== إعداد Multer أولاً ==============
const projectStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join('./public', 'projects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'project-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const projectUpload = multer({ storage: projectStorage });

// ============== مسارات المشاريع (Projects) ==============

// [GET] جلب جميع المشاريع
router.get('/projects', verifyToken, (req, res) => {
  try {
    const data = readData();
    const projects = data.projects || [];
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error in GET /projects:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المشاريع: ' + error.message });
  }
});

// [POST] إضافة مشروع جديد
router.post('/projects', verifyToken, projectUpload.single('image'), (req, res) => {
  try {
    console.log('=== POST /projects ===');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const data = readData();
    if (!data.projects) data.projects = [];

    const { title, tag, desc, tech, link } = req.body;

    if (!title || !tag || !desc || !tech) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    const newProject = {
      id: Date.now(),
      title: title.trim(),
      tag: tag.trim(),
      desc: desc.trim(),
      tech: tech.trim(),
      link: link || '',
      createdAt: new Date().toISOString()
    };

    if (req.file) {
      newProject.image = `/projects/${req.file.filename}`;
    }

    data.projects.push(newProject);
    writeData(data);

    res.status(201).json({ success: true, message: 'تم إضافة المشروع بنجاح!', project: newProject });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ المشروع: ' + error.message });
  }
});

// [DELETE] حذف مشروع
router.delete('/projects/:id', verifyToken, (req, res) => {
  try {
    const data = readData();
    const index = data.projects.findIndex(p => p.id == req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    }

    if (data.projects[index].image) {
      const imagePath = path.join(process.cwd(), 'public', data.projects[index].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    data.projects.splice(index, 1);
    writeData(data);
    res.json({ success: true, message: 'تم حذف المشروع بنجاح' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'تعذر حذف المشروع: ' + error.message });
  }
});

// ============== مسارات الـ Portfolio القديمة (للحفاظ على التوافق) ==============

// [POST] إضافة مشروع جديد (للتوافق مع الواجهة القديمة)
router.post('/portfolio', projectUpload.single('media'), (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!db.projects) db.projects = [];

    const { title, description, notes, link, mediaType, youtubeId, youtubeUrl } = req.body;

    const newItem = {
      id: Date.now(),
      title: title || '',
      description: description || '',
      notes: notes || '',
      link: link || '#',
      mediaType: mediaType || 'image',
      createdAt: new Date().toISOString()
    };

    if (mediaType === 'youtube' && youtubeId) {
      newItem.youtubeId = youtubeId;
      newItem.youtubeUrl = youtubeUrl;
      newItem.mediaType = 'youtube';
    } else if (req.file) {
      newItem.mediaUrl = `/projects/${req.file.filename}`;
      newItem.mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    }

    db.projects.push(newItem);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    res.status(201).json({ success: true, message: 'تم إضافة المشروع بنجاح! 🚀', item: newItem });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ المشروع' });
  }
});

// [DELETE] حذف مشروع (للتوافق)
router.delete('/portfolio/:id', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const index = db.projects.findIndex(p => p.id == req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });

    const item = db.projects[index];
    if (item.mediaUrl) {
      const mediaPath = path.join('./public', item.mediaUrl);
      if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    }

    db.projects.splice(index, 1);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    res.json({ success: true, message: 'تم الحذف بنجاح 🗑️' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'تعذر الحذف' });
  }
});

// [GET] جلب المشاريع للأدمن (للتوافق)
router.get('/portfolio', verifyToken, (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json({ success: true, projects: db.projects || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المشاريع' });
  }
});

// ============== باقي المسارات (الإحصائيات، الفيديوهات، الإعدادات، إلخ) ==============

// 1. جلب الإحصائيات الحالية للتعديل
router.get('/stats', verifyToken, (req, res) => {
  const data = readData();
  res.json({ success: true, stats: data.stats });
});

// 2. تحديث الإحصائيات
router.put('/stats', verifyToken, (req, res) => {
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
router.get('/videos', verifyToken, (req, res) => {
  const data = readData();
  res.json({ success: true, videos: data.videos });
});

// 4. تحديث قائمة الفيديوهات بالكامل
router.put('/videos', verifyToken, (req, res) => {
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

// 4.ب. إضافة فيديو جديد
router.post('/videos', verifyToken, (req, res) => {
  try {
    const { youtubeId, title, description } = req.body;

    if (!youtubeId || !title) {
      return res.status(400).json({ success: false, message: 'يرجى ملء معرف الفيديو والعنوان.' });
    }

    const data = readData();
    if (!data.videos) data.videos = [];

    const newVideo = {
      id: Date.now(),
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

// 4.ج. حذف فيديو معين
router.delete('/videos/:id', verifyToken, (req, res) => {
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
router.get('/all-settings', verifyToken, (req, res) => {
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

// 6. تحديث إعدادات الواجهة
router.put('/settings', verifyToken, (req, res) => {
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

// 7. تحديث روابط التواصل الاجتماعي
router.put('/socials', verifyToken, (req, res) => {
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

// 8. تحديث الأسئلة الشائعة
router.put('/faqs', verifyToken, (req, res) => {
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

// 9. تحديث جدول البث المباشر
router.put('/schedule', verifyToken, (req, res) => {
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

// 10. تحديث مواصفات عتاد الجيمينج
router.put('/gear', verifyToken, (req, res) => {
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
router.get('/messages', verifyToken, (req, res) => {
  try {
    const data = readData();
    const sortedMessages = [...(data.messages || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, messages: sortedMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الرسائل.' });
  }
});

// 12. وضع علامة مقروءة على الرسالة
router.put('/messages/:id/read', verifyToken, (req, res) => {
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
router.delete('/messages/:id', verifyToken, (req, res) => {
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

// 14. المزامنة التلقائية مع يوتيوب
router.post('/youtube/sync', verifyToken, async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'تعذر استخراج معرف القناة من يوتيوب تلقائياً.' });
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

    while ((match = entryRegex.exec(xml)) !== null && syncedVideos.length < 12) {
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