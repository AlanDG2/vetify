#!/usr/bin/env node
/**
 * Reset de estado de un usuario pooled de VETIFY_ADQUIRENTE bloqueado por el límite de
 * videollamadas por mascota (CA01/CA02 IMAS-3909): cancela todas sus videollamadas agendadas
 * usando la misma sesión cacheada en playwright/auth/<userId>.json que usan los tests.
 *
 * Uso:
 *   node scripts/maintenance/reset-pooled-user.mjs <email>
 *   node scripts/maintenance/reset-pooled-user.mjs --all   (todos los VETIFY_ADQUIRENTE de pooled-users.json)
 *
 * Requiere que exista playwright/auth/<userId>.json (se genera solo la primera vez que un test
 * usa ese usuario). Si no existe, avisa y no hace nada (no intenta loguear con password acá).
 *
 * LIMITACIÓN CONOCIDA (2026-08-05, ver qa-workspace/known-issues.md): las cuentas pooled de
 * VETIFY_ADQUIRENTE pueden mutar en tiempo real por algo externo a este repo (otro pipeline u
 * otro proceso contra el mismo ambiente QA compartido) — se observó la mascota de una cuenta
 * cambiar de nombre/raza entre dos requests consecutivos en la misma sesión manual, sin ningún
 * test propio corriendo. Este script sirve para limpiar turnos agendados propios (uso normal:
 * arrancar limpio antes de una corrida), pero si el problema persiste después de correrlo, es
 * evidencia de contención externa, no de un fallo de este script — no reintentar en loop.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const AUTH_DIR = path.join(ROOT, 'playwright/auth');
const POOLED_USERS_PATH = path.join(ROOT, 'src/fixtures/users/pooled-users.json');
const BASE_URL = 'https://vetify-qa.ikeapp.com';

function loadPooledUsers() {
    const data = JSON.parse(fs.readFileSync(POOLED_USERS_PATH, 'utf-8'));
    return data.users.VETIFY_ADQUIRENTE ?? [];
}

function getAccessToken(userId) {
    const authFile = path.join(AUTH_DIR, `${userId}.json`);
    if (!fs.existsSync(authFile)) {
        return null;
    }
    const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const sessionCookie = state.cookies.find((c) => c.name === 'session');
    if (!sessionCookie) return null;
    const session = JSON.parse(decodeURIComponent(sessionCookie.value));
    return session.accessToken;
}

async function getUserPets(token) {
    const res = await fetch(`${BASE_URL}/api/services/pets/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`getUserPets failed: ${res.status}`);
    return res.json();
}

async function getScheduledVideocalls(token) {
    const res = await fetch(`${BASE_URL}/api/services/assistance/local/programmed?filterByProvider=true`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`getScheduledVideocalls failed: ${res.status}`);
    return res.json();
}

async function cancelVideoCall(token, videocallId) {
    // El modal de cancelación real (rediseño IMAS-3894) no tiene selector de motivo. `GET
    // /cancel_reasons` es de la pantalla vieja y devuelve 500 en QA de forma consistente — no
    // hace falta llamarlo. El backend sí exige `motivo_id` en el body (vacío da 500); `1` es un
    // motivo válido confirmado por prueba directa contra la API.
    const res = await fetch(`${BASE_URL}/api/services/pets/cancel/${videocallId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo_id: 1 }),
    });
    return res.ok;
}

async function resetUser(user) {
    console.log(`\n=== ${user.email} (${user.id}) ===`);
    try {
        const token = getAccessToken(user.id);
        if (!token) {
            console.log('  SIN storage state cacheado (playwright/auth/<id>.json no existe) — correr un test que use este usuario primero, o loguear manualmente. Se omite.');
            return;
        }

        const pets = await getUserPets(token);
        console.log(`  pets: ${pets.length} (estados: ${pets.map((p) => p.estado).join(', ') || 'ninguno'})`);

        const scheduled = await getScheduledVideocalls(token);
        console.log(`  videollamadas agendadas: ${scheduled.length}`);

        if (scheduled.length === 0) {
            console.log('  Nada que cancelar. OK.');
            return;
        }

        for (const call of scheduled) {
            const id = call.id ?? call.assistanceId;
            const ok = await cancelVideoCall(token, id);
            console.log(`  cancelar ${id}: ${ok ? 'OK' : 'FALLÓ'}`);
        }

        const remaining = await getScheduledVideocalls(token);
        console.log(`  videollamadas restantes tras cancelar: ${remaining.length}`);
    } catch (err) {
        console.log(`  ERROR procesando este usuario, se sigue con el resto: ${err.message}`);
    }
}

async function main() {
    const arg = process.argv[2];
    const users = loadPooledUsers();

    let targets;
    if (arg === '--all') {
        targets = users;
    } else if (arg) {
        targets = users.filter((u) => u.email === arg);
        if (targets.length === 0) {
            console.error(`No se encontró ${arg} en pooled-users.json (VETIFY_ADQUIRENTE).`);
            process.exit(1);
        }
    } else {
        console.error('Uso: node scripts/maintenance/reset-pooled-user.mjs <email> | --all');
        process.exit(1);
    }

    for (const user of targets) {
        await resetUser(user);
    }
}

main();
