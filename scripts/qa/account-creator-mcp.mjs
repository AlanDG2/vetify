#!/usr/bin/env node
/**
 * Account Creator MCP Server
 *
 * Expone vía MCP (stdio JSON-RPC) las mismas herramientas de creación de cuentas de prueba que
 * `create-test-account.mjs` ya implementa como CLI. Para uso desde terminal, usar directamente:
 *   node scripts/qa/create-test-account.mjs --site OSDE_ADQUIRENTE --plans 1
 *
 * Herramientas MCP disponibles:
 * - create_any_account (crea cualquier tipo de cuenta)
 * - list_fresh_accounts (lista cuentas fresh)
 *
 * REESCRITO 2026-09-14 -- este archivo tenía su PROPIA copia de todo el flujo de creación de cuentas
 * (auth, catálogo, lead, pago, cupón), duplicada y divergente de `create-test-account.mjs`. Cuando
 * ese archivo se arregló ese mismo día (dominio de Quantum migrado, lead vive en Salesforce no en
 * Quantum, bugs de payload de MercadoPago, cupón Capitado vía pool real en vez de un endpoint que
 * nunca existió -- ver `docs/impedimentos-bloqueos.md` IMP-017), esta copia se quedó con TODOS los
 * bugs viejos porque nadie la tocó. En vez de arreglar 2 copias de la misma lógica (y que se
 * desincronicen de nuevo la próxima vez), este archivo ahora importa las funciones ya arregladas y
 * verificadas de `create-test-account.mjs` -- una sola fuente de verdad para el flujo real de API.
 */

import { createAccount, listFreshAccounts, SITE_IDS } from './create-test-account.mjs';
import { createInterface } from 'node:readline';

// ── MCP Tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
    {
        name: 'create_any_account',
        description: 'Crear cuenta de cualquier tipo (auto-detecta flow por siteId). Válidos: VETIFY_ADQUIRENTE, OSDE_ADQUIRENTE, OSDE_CAPITADO, FLUX_CAPITADO',
        inputSchema: {
            type: 'object',
            properties: {
                siteId: { type: 'string', enum: Object.keys(SITE_IDS).filter((s) => s !== 'IKE_WEBAPP'), description: 'Tipo de cuenta' },
                plans: { type: 'number', description: 'Número de planes (default: 1)', default: 1 },
                email: { type: 'string', description: 'Email específico (opcional)' },
                password: { type: 'string', description: 'Password específico (opcional)' },
            },
            required: ['siteId'],
        },
    },
    {
        name: 'list_fresh_accounts',
        description: 'Listar todas las cuentas fresh registradas en fresh-users.json',
        inputSchema: { type: 'object', properties: {} },
    },
];

async function callMcpTool(name, input) {
    switch (name) {
        case 'create_any_account': {
            const { siteId, plans = 1, email = null, password = null } = input;
            if (!SITE_IDS[siteId] || siteId === 'IKE_WEBAPP') {
                throw new Error(`SiteId inválido: ${siteId}`);
            }
            const freshUser = await createAccount(siteId, plans, false, email, password);
            return `✅ Cuenta ${siteId} creada:\n  Email: ${freshUser.email}\n  Password: ${freshUser.password}\n  DNI: ${freshUser.identification.number}\n  SiteId: ${freshUser.siteId}\n  Planes: ${freshUser.numberOfPlans}\n  Guardada en fresh-users.json`;
        }
        case 'list_fresh_accounts': {
            const accounts = listFreshAccounts();
            let out = '📋 Cuentas fresh registradas:\n';
            for (const [siteId, users] of Object.entries(accounts)) {
                if (users.length === 0) continue;
                out += `\n${siteId} (${users.length}):\n`;
                for (const u of users) {
                    out += `  • ${u.email} | DNI: ${u.identification.number} | Planes: ${u.numberOfPlans} | Tags: ${u.tags.join(', ')}\n`;
                }
            }
            return out;
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}

// ── MCP JSON-RPC stdio loop ──────────────────────────────────────────────────

function send(obj) {
    process.stdout.write(JSON.stringify(obj) + '\n');
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (raw) => {
    const line = raw.trim();
    if (!line) return;

    let msg;
    try {
        msg = JSON.parse(line);
    } catch {
        return;
    }

    const { id, method, params } = msg;

    try {
        if (method === 'initialize') {
            send({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'account-creator', version: '2.0.0' } } });
        } else if (method === 'tools/list') {
            send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
        } else if (method === 'tools/call') {
            const text = await callMcpTool(params.name, params.arguments ?? {});
            send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
        } else if (method?.startsWith('notifications/')) {
            // fire-and-forget
        } else {
            send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
        }
    } catch (err) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } });
    }
});

console.error('Account Creator MCP server started (stdio)');
