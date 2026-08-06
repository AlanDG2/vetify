// ─────────────────────────────────────────────────────────────────────────────
// adapters/jira/client.mjs
//
// Adaptador REAL (no stub) de Jira para automation-main. Implementa la interfaz
// de `adapters/ticket-manager.interface.md` reutilizando el cliente ya probado
// en `scripts/jira/jira-client.mjs` (mismo cliente que usa `npm run jira` y el
// MCP server `scripts/jira/jira-mcp-server.mjs`).
//
// Este proyecto NO tiene Xray/Zephyr — no hay gestor de test-management. Las
// operaciones de tests (`listLinkedTests`, `importTests`) son no-ops
// documentados a propósito, no TODOs sin implementar.
//
// Credenciales: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY en
// .env (gitignored) — ya configuradas en este proyecto.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  getIssue,
  searchIssues,
  createIssue,
  updateIssueFields,
  linkIssues,
  addComment,
  extractText,
  BASE,
} from '../../scripts/jira/jira-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RESOLVED_STATUSES = new Set(['done', 'cerrada', 'finalizada', 'closed', 'resuelto', 'resuelta']);

// Este proyecto Jira (IMAS) no tiene un issuetype llamado "Bug" — el equivalente real se
// llama "Error" (confirmado vía `npm run jira:metadata`, ver adapters/jira/dod-ticket.md).
// Se reconocen ambos nombres: "error" porque es lo que este proyecto usa hoy, "bug" porque
// es la convención que asume el template original y con la que otro proyecto Jira (u otro
// idioma de instancia) podría nombrarlo.
const BUG_ISSUETYPE_NAMES = new Set(['bug', 'error']);

// El issuetype "Error" de este proyecto (IMAS) tiene un campo custom propio, "Descripción del
// error", con una plantilla fija de secciones (paneles) — separado del campo `description`
// genérico. Si no se completa, Jira lo deja con su placeholder por defecto (visible como
// "[Describí de forma concisa el problema encontrado]", etc.) — confirmado 2026-08-04 al crear
// IMAS-4102 sin este campo. Descubierto vía `getIssue(key).fields` (no hay endpoint para listar
// field IDs por issuetype) — si Jira reconfigura el screen scheme de "Error", este ID podría
// cambiar y este código quedaría escribiendo a un campo que ya no se ve en pantalla.
const DESCRIPCION_DEL_ERROR_FIELD_ID = 'customfield_11621';

function buildDescripcionDelErrorPanel(panelType, heading, bodyLines) {
  const content = [];
  for (const line of bodyLines) {
    if (content.length) content.push({ type: 'hardBreak' });
    content.push({ type: 'text', text: line });
  }
  return {
    type: 'panel',
    attrs: { panelType },
    content: [
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: heading }] },
      { type: 'paragraph', content },
    ],
  };
}

// `bug.steps`/`bug.actualResult`/etc. son opcionales — con solo `bug.description` (string
// plano), esa descripción va entera en "Breve descripción" y el resto de los paneles quedan con
// una nota neutra en vez del placeholder original de Jira entre corchetes.
function buildDescripcionDelError(bug) {
  const notProvided = 'No especificado al crear este Defect.';
  return {
    type: 'doc',
    version: 1,
    content: [
      buildDescripcionDelErrorPanel('success', 'Breve descripción', [bug.briefDescription || bug.description || bug.summary]),
      buildDescripcionDelErrorPanel('info', 'Pasos para reproducir', bug.steps?.length ? bug.steps : [notProvided]),
      buildDescripcionDelErrorPanel('note', 'Resultado actual', [bug.actualResult || notProvided]),
      buildDescripcionDelErrorPanel('warning', 'Resultado esperado', [bug.expectedResult || notProvided]),
      buildDescripcionDelErrorPanel('success', 'Ambiente y Entorno', [bug.environment || notProvided]),
      buildDescripcionDelErrorPanel('note', 'Evidencia', [bug.evidence || notProvided]),
    ],
  };
}

// ── Guardrail de escrituras: bitácora append-only en jira/sync-log.ndjson ──
// Ver jira/update-rules.md y jira/jira-workflow.md. Nunca debe bloquear la
// operación real de Jira si el log falla a escribirse (ej. FS read-only en CI).
const SYNC_LOG_PATH = resolve(__dirname, '../../jira/sync-log.ndjson');

function appendSyncLog(entry) {
  try {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    appendFileSync(SYNC_LOG_PATH, `${line}\n`);
  } catch {
    // No bloquear la mutación real de Jira si el log no se pudo escribir.
  }
}

// ── Operación 1: fetchStory(id) → texto HU.md ───────────────────────────────
export async function fetchStory(id) {
  const issue = await getIssue(id);
  const f = issue.fields;
  const desc = extractText(f.description) || '(sin descripción)';

  const lines = [
    `# ${issue.key}: ${f.summary}`,
    '',
    `**Estado**: ${f.status?.name ?? '-'}`,
    `**Tipo**: ${f.issuetype?.name ?? '-'}`,
    `**URL**: ${BASE}/browse/${issue.key}`,
    '',
    '## Descripción',
    '',
    desc,
  ];

  if (f.subtasks?.length) {
    lines.push('', '## Subtareas', '');
    for (const s of f.subtasks) {
      lines.push(`- ${s.key}: ${s.fields.summary} [${s.fields.status?.name ?? '?'}]`);
    }
  }

  return lines.join('\n');
}

// ── Operación 2: listLinkedTests(id) → [] (no hay Xray/Zephyr) ─────────────
export async function listLinkedTests(_id) {
  // No-op documentado: este proyecto no tiene gestor de test-management.
  // Los casos de prueba viven en documentation/Casos de Prueba.xlsx y en
  // docs/coverage-register.md (control plane QA de este template).
  return [];
}

// ── Operación 3: importTests(testsFile, id) → {created, skipped, errors} ───
export async function importTests(_testsFile, _id) {
  // No-op documentado: no hay dónde importar (sin Xray/Zephyr).
  return {
    created: 0,
    skipped: 0,
    errors: [
      'No hay gestor de test-management (Xray/Zephyr) configurado en este proyecto.',
      'Registrar los casos manualmente en documentation/Casos de Prueba.xlsx y/o docs/coverage-register.md.',
    ],
  };
}

// ── Operación 4: createDefect(bug) → issue key creado ───────────────────────
// `bug` esperado: { parentKey?, summary, description, steps?, actualResult?, expectedResult?,
// environment?, evidence?, briefDescription?, assigneeAccountId? }. Los campos estructurados
// (steps/actualResult/expectedResult/environment/evidence) son opcionales — sin ellos, todo
// `description` va a "Breve descripción" y el resto queda con una nota neutra en vez del
// placeholder de Jira.
// Crea un issue de tipo "Error" (el bug real de este proyecto Jira — no existe un tipo
// literal "Bug", y "Error" no admite `parent` como las Subtareas). También completa el campo
// custom "Descripción del error" (ver DESCRIPCION_DEL_ERROR_FIELD_ID) — dejarlo vacío hace que
// Jira muestre su plantilla con placeholders entre corchetes en vez del contenido real.
// `parentKey` es OPCIONAL: si se pasa, linkea con "Blocks" a esa HU (para que checkClosable() la
// detecte) y comenta ahí. Sin `parentKey`, el Error queda suelto en el proyecto
// (`JIRA_PROJECT_KEY` del .env) — sin vínculo ni HU asociada, típico de un bug transversal que no
// bloquea ninguna historia puntual (ej. cae directo al backlog para triage del equipo).
export async function createDefect(bug) {
  if (!bug?.summary) {
    throw new Error('createDefect requiere { summary, description?, parentKey? }');
  }
  try {
    const projectKey = bug.parentKey ? (await getIssue(bug.parentKey)).fields.project.key : process.env.JIRA_PROJECT_KEY;
    if (!projectKey) {
      throw new Error('Sin parentKey y sin JIRA_PROJECT_KEY configurado — no se puede determinar el proyecto destino.');
    }
    const created = await createIssue({
      projectKey,
      issueTypeName: 'Error',
      summary: `Bug: ${bug.summary}`,
      description: bug.description,
      assigneeAccountId: bug.assigneeAccountId,
    });
    if (bug.parentKey) {
      await linkIssues(bug.parentKey, 'Blocks', created.key);
    }
    await updateIssueFields(created.key, { [DESCRIPCION_DEL_ERROR_FIELD_ID]: buildDescripcionDelError(bug) });
    if (bug.parentKey && bug.description) {
      await addComment(bug.parentKey, `Bug reportado: ${created.key} — ${bug.summary}`);
    }
    appendSyncLog({
      action: 'createDefect',
      parentKey: bug.parentKey ?? null,
      defectKey: created.key,
      summary: bug.summary,
      result: 'ok',
    });
    return created.key;
  } catch (e) {
    appendSyncLog({
      action: 'createDefect',
      parentKey: bug.parentKey ?? null,
      summary: bug.summary,
      result: 'error',
      error: e.message,
    });
    throw e;
  }
}

// ── Operación 5: getDoDTicketCriteria() → texto de dod-ticket.md ───────────
export async function getDoDTicketCriteria() {
  try {
    return readFileSync(resolve(__dirname, 'dod-ticket.md'), 'utf8');
  } catch {
    return 'Ver adapters/jira/dod-ticket.md (criterio 6).';
  }
}

// ── Operación 6: checkClosable(id) → {closable, missing} ───────────────────
export async function checkClosable(id) {
  let issue;
  try {
    issue = await getIssue(id);
  } catch (e) {
    return { closable: false, missing: [`NO_VERIFICADO_EN_VIVO: ${e.message}`] };
  }

  const missing = [];

  const openBugLinks = (issue.fields.issuelinks ?? []).filter((link) => {
    const linked = link.inwardIssue ?? link.outwardIssue;
    if (!linked) return false;
    const isBug = BUG_ISSUETYPE_NAMES.has((linked.fields?.issuetype?.name ?? '').toLowerCase());
    const status = (linked.fields?.status?.name ?? '').toLowerCase();
    return isBug && !RESOLVED_STATUSES.has(status);
  });

  if (openBugLinks.length > 0) {
    const keys = openBugLinks.map((l) => (l.inwardIssue ?? l.outwardIssue).key).join(', ');
    missing.push(`0 bugs Jira abiertos vinculados: hay ${openBugLinks.length} abierto(s) (${keys})`);
  }

  return { closable: missing.length === 0, missing };
}

// ── Utilidad extra para búsquedas ad-hoc del proyecto (no forma parte de la interfaz) ──
export { searchIssues };
