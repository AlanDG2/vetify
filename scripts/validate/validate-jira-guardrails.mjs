#!/usr/bin/env node
// Valida que el guardrail de escrituras Jira (jira/update-rules.md, jira/jira-workflow.md,
// jira/sync-log.ndjson, adapters/jira/client.mjs) siga presente y consistente.
// Adaptado del validador equivalente en precredit (scripts/validate/validate-jira-guardrails.mjs).

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relPath) {
  try {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
  } catch {
    errors.push(`Falta archivo requerido: ${relPath}`);
    return '';
  }
}

const clientMjs   = read('adapters/jira/client.mjs');
const updateRules = read('jira/update-rules.md');
const workflow     = read('jira/jira-workflow.md');

if (!fs.existsSync(path.join(root, 'jira/sync-log.ndjson'))) {
  errors.push('Falta archivo requerido: jira/sync-log.ndjson');
}

if (clientMjs && !clientMjs.includes('appendSyncLog')) {
  errors.push('adapters/jira/client.mjs debe escribir en jira/sync-log.ndjson via appendSyncLog().');
}

if (clientMjs && !clientMjs.includes('export async function createDefect')) {
  errors.push('adapters/jira/client.mjs debe exportar createDefect() (operacion real de escritura).');
}

for (const [relPath, text] of [
  ['jira/update-rules.md', updateRules],
  ['jira/jira-workflow.md', workflow],
]) {
  if (text && !text.includes('JIRA-WRITE')) {
    errors.push(`${relPath} debe documentar la convencion --confirm=JIRA-WRITE.`);
  }
}

if (errors.length > 0) {
  console.error('Fallo la validacion del guardrail Jira:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Validacion del guardrail Jira OK.');
