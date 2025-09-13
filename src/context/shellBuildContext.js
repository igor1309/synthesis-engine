import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

// Executes repo2md.sh with provided file paths and returns the generated markdown as a string.
// Options: { linesHead?: number, linesTail?: number, cwd?: string, projectRoot?: string }
export async function shellBuildContext(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('shellBuildContext: files array is empty');
  }

  const projectRoot = options.projectRoot || process.cwd();
  const cwd = options.cwd || projectRoot;
  const env = { ...process.env };
  if (typeof options.linesHead === 'number') env.LINES_HEAD = String(options.linesHead);
  if (typeof options.linesTail === 'number') env.LINES_TAIL = String(options.linesTail);

  const scriptPath = path.resolve(projectRoot, 'scripts/repo2md.sh');
  const outPath = path.resolve(cwd, 'repo-content.md');

  try {
    await execFileAsync('bash', [scriptPath, ...files], { cwd, env, windowsHide: true, maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    const stderr = err?.stderr || '';
    const code = err?.code;
    const msg = `repo2md.sh failed${code !== undefined ? ` (exit ${code})` : ''}`;
    const e = new Error(`${msg}${stderr ? `: ${stderr}` : ''}`);
    e.cause = err;
    throw e;
  }

  // Read the generated file and remove it to avoid polluting the repo.
  const content = await fs.readFile(outPath, 'utf-8');
  await fs.rm(outPath, { force: true });
  return content;
}
