import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

export async function readJsonSafe(file, defaultValue = {}) {
  try {
    const data = await fs.readFile(file, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const data = JSON.stringify(value, null, 2);
  await fs.writeFile(file, data);
}

export async function writeFileAtomic(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

