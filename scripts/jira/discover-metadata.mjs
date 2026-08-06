#!/usr/bin/env node
/**
 * Explora metadata del proyecto Jira: issue types, tipos de link, y (si se pasa
 * --issue=KEY) las transiciones disponibles para ese issue puntual.
 *
 * Util para armar convenciones nuevas (que issuetype usar para un Bug, que tipos
 * de link existen) o cuando una transicion falla con "no disponible desde este estado".
 *
 * Uso:
 *   node scripts/jira/discover-metadata.mjs
 *   node scripts/jira/discover-metadata.mjs --issue=IMAS-68
 *   npm run jira:metadata -- --issue=IMAS-68
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

async function get(path) {
  const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
  const res = await fetch(`${BASE}/rest/api/3${path}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] GET ${path}\n${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (!BASE || !EMAIL || !TOKEN) {
    console.error('Faltan variables .env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(1);
  }

  const issueArg = process.argv.find((a) => a.startsWith('--issue='));

  if (issueArg) {
    const key = issueArg.split('=')[1];
    const transitions = await get(`/issue/${key}/transitions`);
    console.log(`\nTransiciones disponibles para ${key}:`);
    for (const t of transitions.transitions) {
      console.log(`  id=${t.id.padEnd(6)} "${t.name}" -> ${t.to?.name ?? '?'}`);
    }
    return;
  }

  if (!PROJECT) {
    console.error('JIRA_PROJECT_KEY no configurado. Usar --issue=KEY o setear JIRA_PROJECT_KEY en .env.');
    process.exit(1);
  }

  const [issueTypes, linkTypes] = await Promise.all([
    get(`/issue/createmeta/${PROJECT}/issuetypes`),
    get('/issueLinkType'),
  ]);

  console.log(`\nIssue types del proyecto ${PROJECT}:`);
  for (const t of issueTypes.issueTypes ?? []) {
    console.log(`  ${t.name.padEnd(20)} subtask=${t.subtask}`);
  }

  console.log('\nTipos de link disponibles:');
  for (const l of linkTypes.issueLinkTypes ?? []) {
    console.log(`  "${l.name}" -> inward="${l.inward}" / outward="${l.outward}"`);
  }

  console.log('\nPara ver transiciones de un issue puntual: --issue=KEY');
}

main().catch((e) => { console.error('\nError:', e.message); process.exit(1); });
