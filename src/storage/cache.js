import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = process.env.REPORTS_DIR || path.resolve(__dirname, '../../reports');


async function ensureReportsDir() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    // Ignore if directory exists
  }
}

function getCacheFilename(city) {
  const today = new Date().toISOString().split('T')[0];
  const safeCity = city.replace(/[^a-zA-Zа-яА-Я0-9\-]/g, '_');
  return `${safeCity}-${today}.json`;
}

function getCachePath(city) {
  return path.join(REPORTS_DIR, getCacheFilename(city));
}


export async function isReportCacheValid(city) {
  const filePath = getCachePath(city);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}


export async function getCachedReport(city) {
  const filePath = getCachePath(city);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return {
      ...data,
      cacheHit: true,
    };
  } catch (error) {
    return null;
  }
}


export async function saveReport(data) {
  await ensureReportsDir();

  const filePath = getCachePath(data.city);
  const content = JSON.stringify(data, null, 2);

  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Не удалось сохранить отчёт для "${data.city}": ${error.message}`);
  }
}