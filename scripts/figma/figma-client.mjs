#!/usr/bin/env node
/**
 * Figma REST API client — exports helpers for the MCP server and runs as CLI.
 *
 * Usage (CLI):
 *   node scripts/figma/figma-client.mjs me
 *   node scripts/figma/figma-client.mjs file <FILE_KEY> [depth]
 *   node scripts/figma/figma-client.mjs node <FILE_KEY> <NODE_ID> [maxDepth]
 *   node scripts/figma/figma-client.mjs styles <FILE_KEY>
 *   node scripts/figma/figma-client.mjs image <FILE_KEY> <NODE_ID> [format] [scale]
 *   node scripts/figma/figma-client.mjs comments <FILE_KEY>
 *
 * Required .env vars:
 *   FIGMA_API_TOKEN     Personal access token from figma.com/settings (Security > Personal access tokens)
 *   FIGMA_FILE_KEY       (optional) default file key, from the file URL:
 *                        https://www.figma.com/design/<FILE_KEY>/<name>?node-id=<NODE_ID>
 *
 * NODE_ID as seen in a Figma URL uses dashes (e.g. "12-34"); the API expects colons ("12:34").
 * This client accepts either form.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── .env loader ──────────────────────────────────────────────────────────────

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), '../../.env'),
  ];
  for (const p of candidates) {
    try {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx < 0) continue;
        const key = t.slice(0, idx).trim();
        const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
      break;
    } catch { /* try next candidate */ }
  }
}

loadEnv();

const TOKEN        = process.env.FIGMA_API_TOKEN ?? '';
const DEFAULT_FILE  = process.env.FIGMA_FILE_KEY ?? '';
const API_BASE      = 'https://api.figma.com/v1';

// ── Core request ─────────────────────────────────────────────────────────────

async function figma(path) {
  if (!TOKEN) throw new Error('Missing FIGMA_API_TOKEN in .env');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-Figma-Token': TOKEN },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] GET ${path}\n${text}`);
  return text ? JSON.parse(text) : null;
}

function normalizeNodeId(id) {
  return id.includes('-') && !id.includes(':') ? id.replace('-', ':') : id;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function getMe() {
  return figma('/me');
}

export async function getFile(fileKey, depth) {
  const qs = depth ? `?depth=${depth}` : '';
  return figma(`/files/${fileKey}${qs}`);
}

export async function getFileNodes(fileKey, nodeIds) {
  const ids = nodeIds.map(normalizeNodeId).join(',');
  return figma(`/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`);
}

export async function getPublishedStyles(fileKey) {
  return figma(`/files/${fileKey}/styles`);
}

export async function getImageUrls(fileKey, nodeIds, format = 'png', scale = 2) {
  const ids = nodeIds.map(normalizeNodeId).join(',');
  return figma(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`);
}

export async function getComments(fileKey) {
  return figma(`/files/${fileKey}/comments`);
}

// ── Shared helpers (design-token formatting) ─────────────────────────────────

export function colorToHex({ r, g, b, a }) {
  const toByte = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
  return a < 1 ? `${hex} (alpha ${a.toFixed(2)})` : hex;
}

export function formatFills(fills) {
  if (!fills?.length) return null;
  return fills
    .filter((f) => f.visible !== false)
    .map((f) => (f.type === 'SOLID' ? colorToHex(f.color) : f.type))
    .join(', ');
}

export function formatBBox(box) {
  if (!box) return null;
  return `${Math.round(box.width)}x${Math.round(box.height)} @ (${Math.round(box.x)}, ${Math.round(box.y)})`;
}

/** Walks a Figma node tree into readable lines: name, type, size, colors, text content. */
export function summarizeNode(node, depth = 0, maxDepth = 6, lines = []) {
  if (!node || depth > maxDepth) return lines;
  const indent = '  '.repeat(depth);
  const bbox = formatBBox(node.absoluteBoundingBox);
  const fills = formatFills(node.fills);
  let line = `${indent}- [${node.type}] ${node.name}`;
  if (bbox) line += ` — ${bbox}`;
  if (fills) line += ` — fill: ${fills}`;
  lines.push(line);
  if (node.type === 'TEXT' && node.characters) {
    const style = node.style ?? {};
    lines.push(`${indent}    text: "${node.characters}"`);
    lines.push(`${indent}    font: ${style.fontFamily ?? '?'} ${style.fontWeight ?? ''} ${style.fontSize ?? '?'}px / line-height ${style.lineHeightPx ?? '?'}px`);
  }
  if (node.cornerRadius) lines.push(`${indent}    radius: ${node.cornerRadius}px`);
  if (node.strokes?.length) lines.push(`${indent}    stroke: ${formatFills(node.strokes)} (${node.strokeWeight ?? '?'}px)`);
  for (const child of node.children ?? []) summarizeNode(child, depth + 1, maxDepth, lines);
  return lines;
}

export { API_BASE };

// ── CLI (only when run directly) ──────────────────────────────────────────────

const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url).endsWith(
  process.argv[1].replace(/\\/g, '/').split('/').pop(),
);

if (IS_CLI) {
  const [,, cmd, ...args] = process.argv;

  const HELP = `
Figma client — commands:
  me                                   Verify token, show your Figma user
  file <FILE_KEY> [depth]              List pages/frames tree (default depth 2)
  node <FILE_KEY> <NODE_ID> [maxDepth]  Print a frame's structure: text, colors, sizes, fonts
  styles <FILE_KEY>                    List published color/text/effect styles
  image <FILE_KEY> <NODE_ID> [fmt] [scale]  Export a frame as image (saved to figma-exports/)
  comments <FILE_KEY>                  List file comments

FILE_KEY comes from the Figma URL: figma.com/design/<FILE_KEY>/<name>
NODE_ID comes from a frame's "Copy link to selection" (node-id=X-Y in the URL)
`;

  if (!cmd || cmd === 'help') {
    console.log(HELP);
    process.exit(0);
  }

  if (!TOKEN) {
    console.error('\nMissing required .env var: FIGMA_API_TOKEN');
    process.exit(1);
  }

  const commands = {
    async me() {
      const user = await getMe();
      console.log(`\nLogged in as: ${user.handle} (${user.email ?? 'no email scope'})`);
    },

    async file([fileKey, depth]) {
      const key = fileKey || DEFAULT_FILE;
      if (!key) throw new Error('Usage: file <FILE_KEY> [depth]  or set FIGMA_FILE_KEY in .env');
      const data = await getFile(key, Number(depth) || 2);
      console.log(`\n${data.name} (last modified ${data.lastModified})\n`);
      for (const page of data.document.children) {
        console.log(`📄 ${page.name}  [${page.id}]`);
        for (const frame of page.children ?? []) {
          console.log(`   └─ ${frame.name}  [${frame.id}]  ${formatBBox(frame.absoluteBoundingBox) ?? ''}`);
        }
      }
    },

    async node([fileKey, nodeId, maxDepth]) {
      const key = fileKey || DEFAULT_FILE;
      if (!key || !nodeId) throw new Error('Usage: node <FILE_KEY> <NODE_ID> [maxDepth]');
      const res = await getFileNodes(key, [nodeId]);
      const entry = Object.values(res.nodes)[0];
      if (!entry) throw new Error(`Node not found: ${nodeId}`);
      console.log(summarizeNode(entry.document, 0, Number(maxDepth) || 6).join('\n'));
    },

    async styles([fileKey]) {
      const key = fileKey || DEFAULT_FILE;
      if (!key) throw new Error('Usage: styles <FILE_KEY>  or set FIGMA_FILE_KEY in .env');
      const res = await getPublishedStyles(key);
      const byType = {};
      for (const s of Object.values(res.meta.styles)) (byType[s.style_type] ??= []).push(s);
      for (const [type, list] of Object.entries(byType)) {
        console.log(`\n${type} (${list.length}):`);
        for (const s of list) console.log(`  ${s.name}`);
      }
    },

    async image([fileKey, nodeId, format, scale]) {
      const key = fileKey || DEFAULT_FILE;
      if (!key || !nodeId) throw new Error('Usage: image <FILE_KEY> <NODE_ID> [format] [scale]');
      const fmt = format || 'png';
      const res = await getImageUrls(key, [nodeId], fmt, Number(scale) || 2);
      const url = Object.values(res.images)[0];
      if (!url) throw new Error('Figma did not return an image URL (node may be empty/invalid).');
      const imgRes = await fetch(url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const dir = resolve(process.cwd(), 'figma-exports');
      mkdirSync(dir, { recursive: true });
      const outPath = resolve(dir, `${normalizeNodeId(nodeId).replace(':', '-')}.${fmt}`);
      writeFileSync(outPath, buf);
      console.log(`\nSaved: ${outPath}`);
    },

    async comments([fileKey]) {
      const key = fileKey || DEFAULT_FILE;
      if (!key) throw new Error('Usage: comments <FILE_KEY>  or set FIGMA_FILE_KEY in .env');
      const res = await getComments(key);
      if (!res.comments.length) return console.log('\nNo comments.');
      for (const c of res.comments) {
        console.log(`\n[${c.created_at}] ${c.user.handle}: ${c.message}`);
      }
    },
  };

  const fn = commands[cmd];
  if (!fn) {
    console.error(`Unknown command: "${cmd}"\n${HELP}`);
    process.exit(1);
  }
  fn(args).catch((e) => { console.error('\nError:', e.message); process.exit(1); });
}
