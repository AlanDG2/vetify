#!/usr/bin/env node
/**
 * Jira REST API v3 client — exports helpers for the MCP server and runs as CLI.
 *
 * Usage (CLI):
 *   node scripts/jira/jira-client.mjs get PROJ-123
 *   node scripts/jira/jira-client.mjs sprint PROJ
 *   node scripts/jira/jira-client.mjs create PROJ-10 "New subtask title"
 *   node scripts/jira/jira-client.mjs assign PROJ-10 user@email.com
 *   node scripts/jira/jira-client.mjs comment PROJ-10 "feedback text"
 *   node scripts/jira/jira-client.mjs transitions PROJ-10
 *   node scripts/jira/jira-client.mjs transition PROJ-10 "In Progress"
 *   node scripts/jira/jira-client.mjs search "project=PROJ AND sprint in openSprints()"
 *
 * Required .env vars:
 *   JIRA_BASE_URL       https://yourorg.atlassian.net
 *   JIRA_EMAIL          your@email.com
 *   JIRA_API_TOKEN      token from id.atlassian.com/manage-profile/security/api-tokens
 *   JIRA_PROJECT_KEY    (optional) default project key for sprint command
 */

import { readFileSync } from 'node:fs';
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

const BASE    = (process.env.JIRA_BASE_URL ?? '').replace(/\/$/, '');
const EMAIL   = process.env.JIRA_EMAIL ?? '';
const TOKEN   = process.env.JIRA_API_TOKEN ?? '';
const PROJECT = process.env.JIRA_PROJECT_KEY ?? '';

// ── Core request ─────────────────────────────────────────────────────────────

async function jira(method, path, body) {
  if (!BASE || !EMAIL || !TOKEN) {
    throw new Error('Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN in .env');
  }
  const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
  const res = await fetch(`${BASE}/rest/api/3${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${method} ${path}\n${text}`);
  return text ? JSON.parse(text) : null;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function getIssue(key) {
  return jira('GET', `/issue/${key}`);
}

// extractText() walks ADF and only collects `text` nodes -- it silently drops `media`/`mediaSingle`
// nodes (images/videos pasted into a comment), which is easy to miss when reading a comment as
// plain text. This walks the same tree but collects attachment ids referenced by media nodes, so
// callers can cross-reference against `getIssue(key).fields.attachment` (which has filename/
// mimeType/content URL per id) instead of silently treating those comments as text-only.
export function extractMediaIds(node, out = []) {
  if (!node) return out;
  if (node.type === 'media' && node.attrs?.id) out.push(node.attrs.id);
  if (Array.isArray(node.content)) for (const child of node.content) extractMediaIds(child, out);
  return out;
}

// Comments aren't part of the default GET /issue/{key} response -- separate subresource.
export async function getComments(key) {
  const data = await jira('GET', `/issue/${key}/comment`);
  return (data?.comments ?? []).map((c) => ({
    author: c.author?.displayName ?? '?',
    created: c.created,
    body: extractText(c.body),
    mediaIds: extractMediaIds(c.body),
  }));
}

export async function searchIssues(jql, maxResults = 50) {
  // /search was removed by Atlassian (CHANGE-2046) — use /search/jql instead.
  return jira('POST', '/search/jql', {
    jql,
    maxResults,
    fields: ['summary', 'status', 'assignee', 'issuetype', 'parent', 'priority',
             'labels', 'description', 'subtasks', 'project'],
  });
}

export async function createChildTask({ parentKey, summary, description, assigneeAccountId }) {
  const parent = await getIssue(parentKey);
  const fields = {
    project:   { key: parent.fields.project.key },
    summary,
    // El issuetype de subtarea en este proyecto Jira está en español ("Subtarea"), no "Subtask"
    // (confirmado via npm run jira:metadata) -- "Subtask" en inglés no existe acá y falla con
    // "Especifica un tipo de incidencia válido".
    issuetype: { name: 'Subtarea' },
    parent:    { key: parentKey },
  };
  if (description)       fields.description = toDoc(description);
  if (assigneeAccountId) fields.assignee    = { accountId: assigneeAccountId };
  return jira('POST', '/issue', { fields });
}

// Top-level (non-subtask) issue, e.g. an "Error" (this project's real bug issuetype — see
// adapters/jira/dod-ticket.md). Unlike createChildTask, this has no parent field: top-level
// issuetypes in this Jira project can't be created as a child of a Historia, they're linked
// via linkIssues() instead.
export async function createIssue({ projectKey, issueTypeName, summary, description, assigneeAccountId }) {
  const fields = {
    project:   { key: projectKey },
    summary,
    issuetype: { name: issueTypeName },
  };
  if (description)       fields.description = toDoc(description);
  if (assigneeAccountId) fields.assignee    = { accountId: assigneeAccountId };
  return jira('POST', '/issue', { fields });
}

export async function updateIssueFields(key, fields) {
  return jira('PUT', `/issue/${key}`, { fields });
}

export async function assignIssue(key, accountId) {
  return jira('PUT', `/issue/${key}/assignee`, { accountId });
}

export async function addComment(key, text) {
  return jira('POST', `/issue/${key}/comment`, { body: toDoc(text) });
}

// Distinto de addComment: recibe un doc ADF crudo (no texto plano vía toDoc), para poder incluir
// nodos `mention` -- toDoc() solo arma texto/hardBreak, no soporta @menciones.
export async function editComment(key, commentId, adfBody) {
  return jira('PUT', `/issue/${key}/comment/${commentId}`, { body: adfBody });
}

// Attachments use multipart/form-data, not the JSON body the `jira()` helper sends -- separate
// request here. X-Atlassian-Token: no-check is required by Jira Cloud for this endpoint (XSRF check).
export async function addAttachment(key, filePath) {
  if (!BASE || !EMAIL || !TOKEN) {
    throw new Error('Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN in .env');
  }
  const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
  const bytes = readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes]), filePath.split(/[\\/]/).pop());
  const res = await fetch(`${BASE}/rest/api/3/issue/${key}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json', 'X-Atlassian-Token': 'no-check' },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] POST /issue/${key}/attachments\n${text}`);
  return text ? JSON.parse(text) : null;
}

export async function getTransitions(key) {
  return (await jira('GET', `/issue/${key}/transitions`)).transitions;
}

export async function transitionIssue(key, nameOrId) {
  const list = await getTransitions(key);
  const t = list.find(x =>
    x.name.toLowerCase() === nameOrId.toLowerCase() || x.id === nameOrId,
  );
  if (!t) throw new Error(`Transition "${nameOrId}" not found. Available: ${list.map(x => x.name).join(', ')}`);
  return jira('POST', `/issue/${key}/transitions`, { transition: { id: t.id } });
}

export async function linkIssues(fromKey, linkType, toKey) {
  return jira('POST', '/issueLink', {
    type:         { name: linkType },
    inwardIssue:  { key: fromKey },
    outwardIssue: { key: toKey },
  });
}

export async function getMyAccountId() {
  return (await jira('GET', '/myself')).accountId;
}

export async function findUserByEmail(email) {
  const results = await jira('GET', `/user/search?query=${encodeURIComponent(email)}&maxResults=5`);
  return Array.isArray(results) ? (results[0] ?? null) : null;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function toDoc(text) {
  const blocks = String(text).split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return {
    type: 'doc', version: 1,
    content: blocks.map((block) => ({
      type: 'paragraph',
      content: block.split('\n').flatMap((line, i, lines) =>
        i < lines.length - 1 ? [{ type: 'text', text: line }, { type: 'hardBreak' }] : [{ type: 'text', text: line }],
      ),
    })),
  };
}

export function extractText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join(' ');
  return '';
}

export { BASE };

// ── CLI (only when run directly) ──────────────────────────────────────────────

const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url).endsWith(
  process.argv[1].replace(/\\/g, '/').split('/').pop(),
);

if (IS_CLI) {
  const [,, cmd, ...args] = process.argv;

  const HELP = `
Jira client — commands:
  get <KEY>                   Get issue details and subtasks
  media <KEY>                 List attachments + which comments reference images/videos
  search "<JQL>" [limit]      Search issues by JQL
  sprint [PROJECT-KEY]        List open sprint issues
  create <PARENT-KEY> <title> Create a subtask under a HU/Story
  assign <KEY> <email>        Assign issue to a user by email
  comment <KEY> <text>        Add a comment to an issue
  transitions <KEY>           List available status transitions
  transition <KEY> <status>   Move issue to a new status
  link <FROM> <type> <TO>     Link two issues
  me                          Show your Jira accountId
`;

  if (!cmd || cmd === 'help') {
    console.log(HELP);
    process.exit(0);
  }

  if (!BASE || !EMAIL || !TOKEN) {
    console.error('\nMissing required .env vars: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(1);
  }

  function formatIssue(issue) {
    const f = issue.fields;
    const lines = [
      `\n╔ ${issue.key} — ${f.summary}`,
      `  Type:     ${f.issuetype?.name ?? '-'}`,
      `  Status:   ${f.status?.name ?? '-'}`,
      `  Assignee: ${f.assignee?.displayName ?? 'Unassigned'}`,
      `  Parent:   ${f.parent?.key ?? '-'}`,
      `  URL:      ${BASE}/browse/${issue.key}`,
    ];
    const desc = extractText(f.description);
    if (desc) lines.push(`\n  Description:\n  ${desc.slice(0, 500)}`);
    if (f.subtasks?.length) {
      lines.push(`\n  Subtasks (${f.subtasks.length}):`);
      for (const s of f.subtasks) {
        lines.push(`    • ${s.key}: ${s.fields.summary} [${s.fields.status?.name ?? '?'}]`);
      }
    }
    return lines.join('\n');
  }

  const commands = {
    async get([key]) {
      if (!key) throw new Error('Usage: get <KEY>');
      console.log(formatIssue(await getIssue(key)));
    },

    async media([key]) {
      if (!key) throw new Error('Usage: media <KEY>');
      const issue = await getIssue(key);
      const attachments = issue.fields.attachment ?? [];
      const byId = new Map(attachments.map((a) => [a.id, a]));
      console.log(`\nAttachments on ${key} (${attachments.length}):`);
      for (const a of attachments) {
        console.log(`  [${a.id}] ${a.filename} (${a.mimeType}, ${a.created})\n    ${a.content}`);
      }
      const comments = await getComments(key);
      const withMedia = comments.filter((c) => c.mediaIds.length);
      if (withMedia.length) {
        console.log(`\nComments referencing media (${withMedia.length}):`);
        for (const c of withMedia) {
          const names = c.mediaIds.map((id) => byId.get(id)?.filename ?? `id:${id} (not in attachment list)`);
          console.log(`  ${c.author} (${c.created}): ${names.join(', ')}`);
        }
      } else {
        console.log('\nNo comments reference media nodes.');
      }
    },

    async search([jql, limit]) {
      if (!jql) throw new Error('Usage: search "<JQL>" [limit]');
      const res = await searchIssues(jql, Number(limit) || 50);
      console.log(`\nShowing ${res.issues.length}${res.isLast ? '' : '+'}:\n`);
      for (const i of res.issues) {
        const f = i.fields;
        console.log(`  ${i.key.padEnd(12)} [${(f.status?.name ?? '?').padEnd(16)}] ${f.assignee?.displayName?.padEnd(20) ?? 'Unassigned          '} ${f.summary}`);
      }
    },

    async sprint([projectKey]) {
      const key = projectKey || PROJECT;
      if (!key) throw new Error('Usage: sprint <PROJECT-KEY>  or set JIRA_PROJECT_KEY in .env');
      await commands.search([`project = "${key}" AND sprint in openSprints() ORDER BY rank ASC`, '100']);
    },

    async create([parentKey, ...titleParts]) {
      if (!parentKey || !titleParts.length) throw new Error('Usage: create <PARENT-KEY> <summary>');
      const r = await createChildTask({ parentKey, summary: titleParts.join(' ') });
      console.log(`\nCreated: ${r.key} — ${BASE}/browse/${r.key}`);
    },

    async assign([key, emailOrId]) {
      if (!key || !emailOrId) throw new Error('Usage: assign <KEY> <email|accountId>');
      let accountId = emailOrId;
      if (emailOrId.includes('@')) {
        const u = await findUserByEmail(emailOrId);
        if (!u) throw new Error(`User not found: ${emailOrId}`);
        accountId = u.accountId;
        console.log(`  Resolved ${emailOrId} → ${u.displayName} (${accountId})`);
      }
      await assignIssue(key, accountId);
      console.log(`\nAssigned ${key} to ${accountId}`);
    },

    async comment([key, ...textParts]) {
      if (!key || !textParts.length) throw new Error('Usage: comment <KEY> <text>');
      await addComment(key, textParts.join(' '));
      console.log(`\nComment added to ${key}`);
    },

    async transitions([key]) {
      if (!key) throw new Error('Usage: transitions <KEY>');
      const list = await getTransitions(key);
      console.log(`\nAvailable transitions for ${key}:`);
      list.forEach(t => console.log(`  ${t.id.padEnd(8)} ${t.name}`));
    },

    async transition([key, ...statusParts]) {
      if (!key || !statusParts.length) throw new Error('Usage: transition <KEY> <status>');
      await transitionIssue(key, statusParts.join(' '));
      console.log(`\nTransitioned ${key} → "${statusParts.join(' ')}"`);
    },

    async link([from, type, to]) {
      if (!from || !type || !to) throw new Error('Usage: link <FROM> <linkType> <TO>');
      await linkIssues(from, type, to);
      console.log(`\nLinked: ${from} → [${type}] → ${to}`);
    },

    async me() {
      const id = await getMyAccountId();
      console.log(`\nYour accountId: ${id}`);
    },
  };

  const fn = commands[cmd];
  if (!fn) {
    console.error(`Unknown command: "${cmd}"\n${HELP}`);
    process.exit(1);
  }
  fn(args).catch(e => { console.error('\nError:', e.message); process.exit(1); });
}
