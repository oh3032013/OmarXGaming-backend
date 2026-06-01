import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

// قراءة البيانات من الملف
export const readData = () => {
  try {
    if (!fs.existsSync(dbPath)) {
      // إذا لم يكن الملف موجوداً، قم بإنشاء ملف أولي فارغ
      const initialData = { stats: { subscribers: 0, views: 0, videos: 0 }, videos: [], messages: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const rawData = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading from database file:', error);
    return { stats: { subscribers: 0, views: 0, videos: 0 }, videos: [], messages: [] };
  }
};

// حفظ البيانات في الملف
export const writeData = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to database file:', error);
    return false;
  }
};
