#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { shellBuildContext } from '../src/context/shellBuildContext.js';
import { nodeBuildContext } from '../src/context/nodeBuildContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function listFilesRecursive(dir) {
  const out = [];
  async function walk(d) {
    let entries = [];
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) await walk(p);
      else if (ent.isFile()) out.push(p);
    }
  }
  await walk(dir);
  return out.sort();
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function normalizeNewlines(s) { return s.replace(/\r?\n/g, '\n'); }

async function main() {
  const projectRoot = path.resolve(path.join(__dirname, '..'));
  const fixturesRoot = path.resolve(path.join(projectRoot, 'test/fixtures'));
  const snapshotsDir = path.resolve(path.join(projectRoot, 'test/snapshots'));
  const tempWorkDir = path.resolve(path.join(projectRoot, 'test/.tmp-shell-cwd'));
  const snapshotPath = path.join(snapshotsDir, 'build-context.md');

  await ensureDir(snapshotsDir);
  await ensureDir(tempWorkDir);

  const files = await listFilesRecursive(fixturesRoot);
  if (files.length === 0) {
    console.error('No fixture files found under test/fixtures');
    process.exit(2);
  }

  const options = { cwd: fixturesRoot, projectRoot, linesHead: 2, linesTail: 2 };

  // Build with shell (source of truth for snapshot)
  const shellOut = normalizeNewlines(await shellBuildContext(files, options));
  // Build with node
  const nodeOut = normalizeNewlines(await nodeBuildContext(files, options));

  // Create snapshot if missing
  let haveSnapshot = false;
  try { await fs.access(snapshotPath); haveSnapshot = true; } catch {}
  if (!haveSnapshot) {
    await fs.writeFile(snapshotPath, shellOut, 'utf-8');
    console.log(`Created snapshot at ${path.relative(projectRoot, snapshotPath)}`);
  }

  const snapshot = await fs.readFile(snapshotPath, 'utf-8');

  // Compare
  let pass = true;
  if (shellOut !== snapshot) {
    pass = false;
    await fs.writeFile(path.join(snapshotsDir, 'actual-shell.md'), shellOut, 'utf-8');
    console.error('Shell builder output does not match snapshot. See test/snapshots/actual-shell.md');
  }
  if (nodeOut !== snapshot) {
    pass = false;
    await fs.writeFile(path.join(snapshotsDir, 'actual-node.md'), nodeOut, 'utf-8');
    console.error('Node builder output does not match snapshot. See test/snapshots/actual-node.md');
  }

  if (!pass) {
    process.exit(1);
  }

  console.log('BuildContext snapshot parity: OK');
}

main().catch((err) => { console.error(err); process.exit(1); });

