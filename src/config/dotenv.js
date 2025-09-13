import fs from 'fs/promises';
import path from 'path';

export async function loadDotEnv(projectRoot = process.cwd(), filenames = ['.env', '.env.local']) {
  for (const name of filenames) {
    const fp = path.resolve(projectRoot, name);
    let text = '';
    try { text = await fs.readFile(fp, 'utf-8'); } catch { continue; }
    applyEnv(parseDotEnv(text));
  }
}

function parseDotEnv(src) {
  const env = {};
  const lines = String(src).split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const cleaned = line.startsWith('export ')? line.slice(7).trim() : line;
    const eq = cleaned.indexOf('=');
    if (eq === -1) continue;
    const key = cleaned.slice(0, eq).trim();
    let val = cleaned.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Basic escapes for \n and \t
    val = val.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    if (key) env[key] = val;
  }
  return env;
}

function applyEnv(map) {
  for (const [k, v] of Object.entries(map)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

