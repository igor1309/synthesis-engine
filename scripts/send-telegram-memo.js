import fs from 'fs/promises';

const memoPath = process.env.MEMO_PATH || 'synthesis_memo.md';
const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token || !chatId) {
  console.log('Telegram secrets not set; skipping');
  process.exit(0);
}

const raw = await fs.readFile(memoPath, 'utf8');

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderLine = (rawLine) => {
  let line = rawLine;
  let isHeading = false;
  const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
  if (headingMatch) {
    line = headingMatch[1];
    isHeading = true;
  }
  let isBullet = false;
  const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
  if (bulletMatch) {
    line = bulletMatch[1];
    isBullet = true;
  }
  line = escapeHtml(line);
  line = line.replace(/`([^`]+)`/g, '<code>$1</code>');
  line = line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  if (isHeading) line = `<b>${line}</b>`;
  if (isBullet) line = `• ${line}`;
  return line;
};

const html = raw.split(/\r?\n/).map(renderLine).join('\n');

const chunk = (text, limit = 3500) => {
  const blocks = text.split(/\n{2,}/);
  const parts = [];
  let current = '';
  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) {
      parts.push(current);
      current = '';
    }
    if (block.length <= limit) {
      current = block;
      continue;
    }
    let rest = block;
    while (rest.length > limit) {
      parts.push(rest.slice(0, limit));
      rest = rest.slice(limit);
    }
    current = rest;
  }
  if (current) parts.push(current);
  return parts;
};

const parts = chunk(html);
for (const part of parts) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: part, parse_mode: 'HTML' })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}
