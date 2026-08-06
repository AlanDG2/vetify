#!/usr/bin/env node
/**
 * Smoke test de credenciales Jira — primera cosa a correr si otro script falla con 401/403.
 *
 * Uso:
 *   node scripts/jira/check-connection.mjs
 *   npm run jira:check
 *
 * Verifica GET /myself (credenciales válidas) y GET /project/{JIRA_PROJECT_KEY}
 * (el proyecto configurado existe y es visible para el usuario autenticado).
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
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

async function main() {
  console.log('Chequeo de conexion Jira\n');

  if (!BASE || !EMAIL || !TOKEN) {
    console.error('Faltan variables .env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(1);
  }

  console.log(`  JIRA_BASE_URL:    ${BASE}`);
  console.log(`  JIRA_EMAIL:       ${EMAIL}`);
  console.log(`  JIRA_PROJECT_KEY: ${PROJECT || '(no configurado)'}\n`);

  const me = await get('/myself');
  if (!me.ok) {
    console.error(`[FALLO] GET /myself -> ${me.status}. Revisar JIRA_EMAIL/JIRA_API_TOKEN.`);
    process.exit(1);
  }
  console.log(`[OK] Autenticado como: ${me.data.displayName} (${me.data.emailAddress})`);

  if (!PROJECT) {
    console.log('\nJIRA_PROJECT_KEY no configurado - se omite verificacion de proyecto.');
    process.exit(0);
  }

  const project = await get(`/project/${PROJECT}`);
  if (!project.ok) {
    console.error(`[FALLO] GET /project/${PROJECT} -> ${project.status}. Revisar JIRA_PROJECT_KEY o permisos.`);
    process.exit(1);
  }
  console.log(`[OK] Proyecto visible: ${project.data.key} - ${project.data.name}`);
  console.log('\nConexion Jira OK.');
}

main().catch((e) => { console.error('\nError:', e.message); process.exit(1); });
