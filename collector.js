import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { buildContext } from './src/context/index.js';
import { loadConfig } from './src/config/index.js';
import { createGitHubClient } from './src/github/client.js';
import { collectAll } from './src/github/collect.js';

// Placeholder util to keep API symmetry if needed later
const noop = promisify((cb) => cb(null));

// --- CONFIGURATION ---
const GH_PAT = process.env.GH_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEMP_DIR = './temp_inbox_files';
const REPOS_FILE = 'config/repos.txt';
const OUTPUT_FILE = 'synthesis_memo.md';
const MASTER_PROMPT_FILE = 'prompts/master.md';

// --- INITIALIZE CLIENTS ---
const octokit = new Octokit({ auth: GH_PAT });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });


// --- MAIN LOGIC ---
async function main() {
  try {
    // Load and validate configuration
    const cfg = await loadConfig(process.cwd());

    // 1. Collect Files: Loop through repos and download .md files from their 'inbox'
    console.log('Starting file collection...');
    const gh = createGitHubClient(cfg.ghPat);
    const savedFiles = await collectAll(gh, cfg, { concurrency: 6 });
    console.log(`File collection complete. Downloaded: ${savedFiles.length} file(s).`);

    // 4. Prepare Context: Build consolidated markdown context from collected files
    console.log('Generating context from collected files...');
    const files = savedFiles.length ? savedFiles : await listFilesRecursive(cfg.tempDir);
    if (files.length === 0) {
      console.warn('No files collected; context will be empty.');
    }
    const context = await buildContext(files, {
      cwd: cfg.tempDir,
      projectRoot: process.cwd(),
      linesHead: Number(process.env.LINES_HEAD) || 0,
      linesTail: Number(process.env.LINES_TAIL) || 0,
    });
    
    // 5. Call AI for Synthesis: Send the context to OpenAI with the master prompt
    console.log('Sending context to AI for synthesis...');
    // ... logic to call OpenAI API with the master prompt and the 'context' variable ...
    const memoContent = "AI Generated Content Here"; // Placeholder

    // 6. Save Output: Write the AI's response to the final markdown file
    await fs.writeFile(OUTPUT_FILE, memoContent);
    console.log(`Synthesis memo saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  } finally {
    // 7. Cleanup: Remove the temporary directory
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  }
}

async function listFilesRecursive(dir) {
  const out = [];
  async function walk(d) {
    let entries = [];
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        await walk(p);
      } else if (ent.isFile()) {
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

main();
