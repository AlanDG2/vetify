#!/usr/bin/env node
/**
 * Create Test Account Script
 *
 * Crea cuentas de prueba de CUALQUIER tipo (Adquirente / Capitado) via API real,
 * y las registra en fresh-users.json para uso inmediato con UserProvider.
 *
 * Uso:
 *   node scripts/qa/create-test-account.mjs --site OSDE_CAPITADO --plans 1 --add-pet
 *   node scripts/qa/create-test-account.mjs --site VETIFY_ADQUIRENTE --plans 2
 *   node scripts/qa/create-test-account.mjs --site FLUX_CAPITADO --plans 1 --add-pet --email mi@email.com --password MiPass123!
 *   node scripts/qa/create-test-account.mjs --all-types --plans 1 --add-pet
 *
 * Requiere variables de entorno en .env:
 *   VETIFY_INSTITUTIONAL_BASE_URL (login /api/quantum/jauth/token + Salesforce /api/sf/...)
 *   VETIFY_QUANTUM_BASE_URL       (catálogo/pago de Quantum, /api/v1/jengage/...)
 *
 * REESCRITO 2026-09-14 -- el flujo Adquirente original le pegaba TODO (lead incluido) a
 * `${VETIFY_INSTITUTIONAL_BASE_URL}/api/quantum/jengage/...`, que hoy da 404 para lead/create y
 * para catalog/payment. Investigando con una colección Postman real del equipo (armada por
 * "pmendoza", ver `Vetify.postman_collection.json` en la raíz del repo) se confirmó la arquitectura
 * real: el lead vive en Salesforce (`${VETIFY_INSTITUTIONAL_BASE_URL}/api/sf/first-step`/
 * `second-step`/`ecommerce`, "lead/create" en Quantum NUNCA existió), y catálogo/pago viven en un
 * dominio Quantum SEPARADO (`${VETIFY_QUANTUM_BASE_URL}/api/v1/jengage/...`, no
 * `/api/quantum/jengage/...`). Confirmado en vivo con una compra real aprobada (póliza 20359411)
 * antes de reescribir este script. Mismo fix ya aplicado en
 * `src/api/vetify/institutional/vetify-institutional-api.ts` (VetifyInstitutionalApiClient) -- este
 * script replica ese mismo flujo en JS plano porque corre fuera de Playwright.
 *
 * Nota sobre el catálogo (`cuenta=MA_VETIFY`): hoy en QA devuelve un solo producto,
 * "Vetify Classic x 1 OSDE" -- un problema de DATOS del catálogo, no de código (ver IMP-017
 * en docs/impedimentos-bloqueos.md). El filtro de marca de abajo replica exactamente el mismo
 * criterio que ya usa VetifyInstitutionalApiClient.getPlans() (excluir "OSDE" del nombre solo para
 * brand=vetify) -- por eso VETIFY_ADQUIRENTE puede seguir sin planes disponibles hasta que el
 * catálogo tenga un producto Vetify real cargado, mientras que OSDE_ADQUIRENTE sí puede usar el
 * único plan disponible hoy (no se excluye a sí mismo).
 */

import dotenv from 'file:///C:/ike/vetify-automation/automation/node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'C:/ike/vetify-automation/automation/.env' });

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { v4 as uuidv4 } from 'file:///C:/ike/vetify-automation/automation/node_modules/uuid/dist/esm-node/index.js';

const BASE_URL = process.env.VETIFY_INSTITUTIONAL_BASE_URL;
if (!BASE_URL) {
    console.error('❌ Falta VETIFY_INSTITUTIONAL_BASE_URL en .env');
    process.exit(1);
}

const QUANTUM_BASE_URL = process.env.VETIFY_QUANTUM_BASE_URL;
if (!QUANTUM_BASE_URL) {
    console.error('❌ Falta VETIFY_QUANTUM_BASE_URL en .env (dominio de catálogo/pago de Quantum, ej. https://qa-quantum.ike.ar)');
    process.exit(1);
}

const CAMPAIGN_ID = '701O200000lHMtlIAG';

const SITE_IDS = {
    VETIFY_ADQUIRENTE: { brand: 'vetify', type: 'adquirente', checkout: true },
    OSDE_ADQUIRENTE:   { brand: 'osde',  type: 'adquirente', checkout: true },
    OSDE_CAPITADO:     { brand: 'osde',  type: 'capitado',  checkout: false },
    FLUX_CAPITADO:     { brand: 'flux',  type: 'capitado',  checkout: false },
    IKE_WEBAPP:        { brand: 'ike',   type: 'webapp',   checkout: false },
};

const FRESH_USERS_FILE = path.resolve('C:/ike/vetify-automation/automation/src/fixtures/users/fresh-users.json');
const FRESH_USERS_LOCK = path.resolve('C:/ike/vetify-automation/automation/src/fixtures/users/fresh-users.lock');

function parseArgs() {
    const args = { site: 'OSDE_CAPITADO', plans: 1, addPet: false, email: null, password: null, allTypes: false };
    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg === '--site' || arg === '-s') args.site = process.argv[++i];
        else if (arg === '--plans' || arg === '-p') args.plans = parseInt(process.argv[++i]);
        else if (arg === '--add-pet') args.addPet = true;
        else if (arg === '--email') args.email = process.argv[++i];
        else if (arg === '--password') args.password = process.argv[++i];
        else if (arg === '--all-types') args.allTypes = true;
        else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
    }
    return args;
}

function printHelp() {
    console.log(`
Usage: node scripts/qa/create-test-account.mjs [options]

Options:
  --site, -s <SITE_ID>     Tipo de cuenta: VETIFY_ADQUIRENTE | OSDE_ADQUIRENTE | OSDE_CAPITADO | FLUX_CAPITADO | IKE_WEBAPP (default: OSDE_CAPITADO)
  --plans, -p <N>          Número de planes a crear (default: 1)
  --add-pet                Añadir mascota al plan (solo Capitado, default: false)
  --email <email>          Email específico (default: aleatorio test-<timestamp>@automation.com)
  --password <pass>        Password específico (default: Vetify15!)
  --all-types              Crear una cuenta de cada tipo en una sola corrida
  --help, -h               Mostrar esta ayuda

Site IDs válidos:
  VETIFY_ADQUIRENTE  - Compra con tarjeta (MercadoPago), plan individual
  OSDE_ADQUIRENTE    - Compra con tarjeta (MercadoPago), plan OSDE
  OSDE_CAPITADO      - Canje de cupón OSDE, sin pago
  FLUX_CAPITADO      - Canje de cupón Flux, sin pago
  IKE_WEBAPP         - Panel interno Iké (no tiene flow de compra pública)
`);
}

// --- Auth & HTTP helpers ---

async function getAuthToken() {
    const res = await fetch(`${BASE_URL}/api/quantum/jauth/token`, { method: 'GET' });
    if (!res.ok) throw new Error(`Auth token failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!data.accessToken) throw new Error('Auth token: no accessToken in response');
    return data.accessToken;
}

// endpoint puede ser un path relativo a `base`, o una URL absoluta (se usa tal cual en ese caso).
async function apiGet(base, endpoint, token) {
    const url = /^https?:\/\//.test(endpoint) ? endpoint : `${base}${endpoint}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} | ${await res.text()}`);
    return res.json();
}

async function apiPost(base, endpoint, token, body) {
    const url = /^https?:\/\//.test(endpoint) ? endpoint : `${base}${endpoint}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const responseBody = await res.text();
        // Se adjunta status/body al Error (no solo en el mensaje) para que el llamador pueda
        // distinguir programáticamente una falla PERMANENTE (ej. cupón ya usado) de una transitoria
        // -- ver getCapitadoCupon/createCapitadoAccount. Hallazgo real 2026-09-14.
        const err = new Error(`POST ${url} failed: ${res.status} ${res.statusText} | ${responseBody}`);
        err.status = res.status;
        err.body = responseBody;
        throw err;
    }
    // Algunos endpoints de /api/sf/... devuelven 200 con body vacío -- no asumir JSON siempre.
    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

function randomEmail(prefix = 'test') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}@automation.com`;
}

function randomDni() {
    // DNI argentino válido: 7-8 dígitos, no empiece con 0
    const len = 7 + Math.floor(Math.random() * 2);
    let dni = String(1000000 + Math.floor(Math.random() * 90000000));
    return dni.slice(0, len);
}

function randomPassword() {
    return 'Vetify15!';
}

// --- Capitado flow ---
// /api/registro nunca formó parte del bloqueo de Quantum, sin cambios ahí.
// El cupón, en cambio, NUNCA fue un endpoint en vivo -- confirmado leyendo
// src/providers/cupon/cupon-factory.ts: "IMAS-3970: no existe un endpoint de generación de cupones
// para Capitado -- los cupones de registro se consiguen manualmente y se cargan en
// src/fixtures/cupons/one-time-cupons.json". El script original le pegaba a
// /api/quantum/jengage/cupon/generate/{osde|flux} -- probado en vivo 2026-09-14 con 3 combinaciones
// de dominio/path distintas (BASE_URL viejo, QUANTUM_BASE_URL con y sin /v1/) y las 3 dan 404 --
// nunca existió, no es parte de la migración de hoy. Se reescribe acá para consumir el mismo pool
// real que ya usa CuponFactory/CuponProvider/CuponPool, en vez de seguir llamando a algo que no existe.

const ONE_TIME_CUPONS_FILE = path.resolve('C:/ike/vetify-automation/automation/src/fixtures/cupons/one-time-cupons.json');
const ONE_TIME_CUPONS_LOCK = path.resolve('C:/ike/vetify-automation/automation/src/fixtures/cupons/one-time-cupons.lock');

function cuponMatchesProject(cupon, siteId) {
    if (cupon.universal) return true;
    return Array.isArray(cupon.projects) && cupon.projects.includes(siteId);
}

// Consume un cupón one-time del mismo pool que usa CuponPool.consumeOneTimeCupon() (TS) -- reusa el
// MISMO archivo y el MISMO lock file para no pisarse con una corrida de Playwright en paralelo.
async function getCapitadoCupon(_token, siteId) {
    acquireLock(ONE_TIME_CUPONS_LOCK);
    try {
        const state = JSON.parse(fs.readFileSync(ONE_TIME_CUPONS_FILE, 'utf-8'));
        const matchingIndexes = state.cupons
            .map((cupon, index) => ({ cupon, index }))
            .filter(({ cupon }) => cupon.type === 'one-time' && cuponMatchesProject(cupon, siteId));

        if (matchingIndexes.length === 0) {
            throw new Error(`No hay cupones one-time disponibles en el pool para ${siteId} (src/fixtures/cupons/one-time-cupons.json) -- ver IMP-001 en docs/impedimentos-bloqueos.md.`);
        }

        const { index } = matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)];
        const [consumed] = state.cupons.splice(index, 1);
        fs.writeFileSync(ONE_TIME_CUPONS_FILE, JSON.stringify(state, null, 2), 'utf-8');
        return consumed;
    } finally {
        releaseLock(ONE_TIME_CUPONS_LOCK);
    }
}

// Devuelve un cupón al pool -- para cuando se lo consumió (splice) pero el registro real terminó
// fallando por un motivo TRANSITORIO (no porque el token ya estuviera usado). Mismo mecanismo que
// CuponPool.releaseOneTimeCupon() (TS) -- mismo archivo y lock file. Hallazgo real 2026-09-14.
function releaseCapitadoCupon(cupon) {
    acquireLock(ONE_TIME_CUPONS_LOCK);
    try {
        const state = JSON.parse(fs.readFileSync(ONE_TIME_CUPONS_FILE, 'utf-8'));
        state.cupons.push(cupon);
        fs.writeFileSync(ONE_TIME_CUPONS_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } finally {
        releaseLock(ONE_TIME_CUPONS_LOCK);
    }
}

function isCuponAlreadyUsedError(e) {
    return e.status === 409 && /token.*existe|duplicad/i.test(e.body || '');
}

async function registerCapitado(token, cuponCode, email, dni, firstName = 'Test', lastName = 'Automation') {
    return apiPost(BASE_URL, '/api/registro', token, {
        nombre: firstName,
        apellido: lastName,
        telefono: '+541112345678',
        tipoDocumento: 'DNI',
        documento: dni,
        mail: email,
        token: cuponCode,
    });
}

// Junta get-cupon + registro + decisión de liberar/descartar en un solo lugar -- se usa tanto para
// el registro principal como para los planes extra de createCapitadoAccount, así ambos caminos
// quedan protegidos igual sin duplicar la lógica de decisión.
async function registerCapitadoWithFreshCupon(token, siteId, email, dni) {
    const cupon = await getCapitadoCupon(token, siteId);
    console.log(`   Usando cupón de registro ${cupon.code} para ${siteId}`);
    try {
        await registerCapitado(token, cupon.code, email, dni);
        return cupon;
    } catch (e) {
        if (isCuponAlreadyUsedError(e)) {
            console.error(`   ⚠️ Cupón ${cupon.code} ya estaba usado en el backend -- se descarta definitivamente (no se devuelve al pool).`);
        } else {
            releaseCapitadoCupon(cupon);
            console.error(`   ⚠️ Cupón ${cupon.code} devuelto al pool (falla no relacionada al cupón en sí): ${e.message}`);
        }
        throw e;
    }
}

// --- Adquirente flow ---
// Lead y confirmación de pago: Salesforce (BASE_URL, /api/sf/...).
// Catálogo y pago con tarjeta: Quantum nuevo (QUANTUM_BASE_URL, /api/v1/jengage/...).

async function getPlans(token, brand = 'vetify') {
    // La API real ignora cualquier query param de brand (confirmado en vivo 2026-09-14: la misma
    // respuesta vuelve con y sin &brand=osde) -- el filtro tiene que ser client-side, igual que en
    // VetifyInstitutionalApiClient.getPlans().
    const products = await apiGet(QUANTUM_BASE_URL, '/api/v1/jengage/catalog/products?cuenta=MA_VETIFY', token);
    return products.filter((p) => !(brand === 'vetify' && p.name.includes('OSDE')));
}

async function registerFirstStep(token, firstName, lastName, email, dni, planId, planQuantity = 1) {
    const payload = {
        leadId: '',
        PASO_ALCANZADO: 1,
        PAGADO: false,
        MOTIVO_RECHAZO: '',
        LINK: '',
        NOMBRE: firstName,
        APELLIDO: lastName,
        CODIGO_AREA: '11',
        TELEFONO: '50511958',
        email,
        TIPO_DOCUMENTO: '96',
        TIPO_DOCUMENTO_SELECCIONADO: 'DNI',
        NUMERO_DOCUMENTO: dni,
        LANDING: 'Mascotas',
        CampaignId: CAMPAIGN_ID,
        Products: [{ id: planId, cantidad: planQuantity }],
        JSON_VERIFICACION_EMAIL: '',
        JSON_VERIFICACION_TELEFONO: '',
        CUPON: '',
        CUPON_DETALLE: '',
    };
    const data = await apiPost(BASE_URL, '/api/sf/first-step', token, payload);
    if (!data.leadId) throw new Error('Lead id not retrieved from /api/sf/first-step');
    return data.leadId;
}

async function registerSecondStep(token, firstName, lastName, email, dni, planId, planQuantity, leadId) {
    const payload = {
        PASO_ALCANZADO: 2,
        PAGADO: false,
        MOTIVO_RECHAZO: '',
        LINK: '',
        NOMBRE: firstName,
        APELLIDO: lastName,
        CODIGO_AREA: '11',
        TELEFONO: '50511958',
        email,
        TIPO_DOCUMENTO: '96',
        TIPO_DOCUMENTO_SELECCIONADO: 'DNI',
        NUMERO_DOCUMENTO: dni,
        LANDING: 'Mascotas',
        PROVINCIA: '1',
        LOCALIDAD: '1',
        CALLE: 'Av Corrientes',
        NUMERO_CALLE: '123',
        PISO: null,
        DEPTO: '',
        CODIGO_POSTAL: '1234',
        JSON_VERIFICACION_EMAIL: '',
        JSON_VERIFICACION_TELEFONO: '',
        CUPON_DETALLE: '',
        CUPON: '',
        Products: [{ id: planId, cantidad: planQuantity }],
        CampaignId: CAMPAIGN_ID,
        leadId,
    };
    await apiPost(BASE_URL, '/api/sf/second-step', token, payload);
}

async function createPurchase(token, checkoutData) {
    return apiPost(QUANTUM_BASE_URL, '/api/v1/jengage/payment/pagar-mp?cuenta=MA_VETIFY', token, checkoutData);
}

async function registerPaymentConfirmation(token, firstName, lastName, email, dni, planId, planQuantity, leadId) {
    const payload = {
        PASO_ALCANZADO: 3,
        PAGADO: true,
        MOTIVO_RECHAZO: '',
        LINK: '',
        NOMBRE: firstName,
        APELLIDO: lastName,
        CODIGO_AREA: '11',
        TELEFONO: '50511958',
        email,
        TIPO_DOCUMENTO: '96',
        TIPO_DOCUMENTO_SELECCIONADO: 'DNI',
        NUMERO_DOCUMENTO: dni,
        LANDING: 'Mascotas',
        PROVINCIA: '1',
        LOCALIDAD: '1',
        CALLE: 'Av Corrientes',
        NUMERO_CALLE: '123',
        PISO: null,
        DEPTO: '',
        CODIGO_POSTAL: '1234',
        JSON_VERIFICACION_EMAIL: '',
        JSON_VERIFICACION_TELEFONO: '',
        CUPON_DETALLE: '',
        CUPON: '',
        Products: [{ id: planId, cantidad: planQuantity }],
        CampaignId: CAMPAIGN_ID,
        leadId,
    };
    // Confirmado en vivo 2026-09-14: este paso también es Salesforce (/api/sf/ecommerce), no Quantum
    // -- el script original le pegaba a /api/quantum/jengage/payment/confirm, que nunca existió ahí.
    await apiPost(BASE_URL, '/api/sf/ecommerce', token, payload);
}

// --- Lock for fresh-users.json ---
function acquireLock(lockFile) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        try {
            const fd = fs.openSync(lockFile, 'wx');
            fs.closeSync(fd);
            return;
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
            try {
                const stat = fs.statSync(lockFile);
                if (Date.now() - stat.mtimeMs > 30000) fs.unlinkSync(lockFile);
            } catch {}
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    throw new Error('Failed to acquire lock');
}

function releaseLock(lockFile) {
    try { fs.unlinkSync(lockFile); } catch {}
}

function readFreshUsers() {
    if (!fs.existsSync(FRESH_USERS_FILE)) return { users: {} };
    return JSON.parse(fs.readFileSync(FRESH_USERS_FILE, 'utf-8'));
}

function writeFreshUsers(state) {
    fs.writeFileSync(FRESH_USERS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function addFreshUser(user) {
    acquireLock(FRESH_USERS_LOCK);
    try {
        const state = readFreshUsers();
        if (!state.users[user.siteId]) state.users[user.siteId] = [];
        state.users[user.siteId].push(user);
        writeFreshUsers(state);
    } finally { releaseLock(FRESH_USERS_LOCK); }
}

// --- Main creation logic ---

async function createAdquirenteAccount(siteId, plans, email, password) {
    const token = await getAuthToken();
    const brand = SITE_IDS[siteId].brand;
    const dni = randomDni();
    const plansList = await getPlans(token, brand);
    if (plansList.length === 0) {
        throw new Error(`El catálogo (cuenta=MA_VETIFY) no tiene ningún plan disponible para brand="${brand}" ahora mismo -- esto es un problema de datos del catálogo en QA, no de este script (ver IMP-017 en docs/impedimentos-bloqueos.md).`);
    }
    const leadIds = [];

    for (let i = 0; i < plans; i++) {
        const plan = plansList[Math.floor(Math.random() * plansList.length)];
        const leadId = await registerFirstStep(token, 'Test', 'Automation', email, dni, plan.id.toString(), 1);
        leadIds.push(leadId);
        await registerSecondStep(token, 'Test', 'Automation', email, dni, plan.id.toString(), 1, leadId);

        // Valores numéricos reales (brandCardId/paymentTypeId) confirmados en vivo 2026-09-14 --
        // el script original mandaba 'credit_card'/'visa' (strings) donde el backend espera enteros,
        // lo cual daba 400 "Cannot deserialize value of type int from String". Mismos valores que
        // src/integrations/mercadopago/mercadoPagoCardProviders.ts (VISA crédito).
        const paymentCard = {
            cardNumber: '4509953566233704', // VISA test aprobada
            cardholder: { name: 'TEST AUTOMATION', paymentTypeId: 1, brandCardId: 1 },
            expirationYear: String(new Date().getFullYear() + 3),
            expirationMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
            securityCode: '123',
        };

        await createPurchase(token, {
            calculateParam: {
                idTarjeta: 1, esCredito: 1, esDebito: 0, cupon: '', couponDescription: '',
                listInvoicedProducts: [{ id: plan.id, qty: 1 }],
                subtotalWODiscount: plan.price, discounts: 0, subtotalWDiscount: plan.price,
                total: plan.price, idPayType: 1,
            },
            payer: {
                firstName: 'Test', lastName: 'AUTOMATION', email, areaCode: '11',
                telephoneNumber: '50511958', streetName: 'Av Corrientes', streetNumber: '123',
                zipCode: '1234', city: 1, province: 1, vip: 'N', sex: 'M', piso: '', depto: '',
                dateBirth: '01-01-1990',
                payerIdentification: { type: '96', number: dni, typeDocument: '96' },
            },
            tokenVentaMercadoPago: {
                cardNumber: paymentCard.cardNumber, email,
                // La identificación va DENTRO de cardholder, no como hermano -- confirmado en vivo
                // 2026-09-14 (el script original la ponía como hermana y el backend tiraba NPE
                // porque nunca la encontraba ahí).
                cardholder: { ...paymentCard.cardholder, identification: { number: dni, type: 'DNI' } },
                expirationYear: paymentCard.expirationYear, expirationMonth: paymentCard.expirationMonth,
                securityCode: paymentCard.securityCode,
            },
            paymentMethodId: 'credit_card', transactionAmount: plan.price, idVenta: null,
            tokenSale: null, externalReference: null, payId: null,
            campania: 'VETIFY-CHECKOUT-2025',
            urlImagenProducto: 'https://plans.ikeargentina.com.ar/vetify/assets/plan-image.png',
            deviceId: `test-device-id-${Date.now()}`,
        });

        await registerPaymentConfirmation(token, 'Test', 'Automation', email, dni, plan.id.toString(), 1, leadId);
    }

    return { email, password, identification: { type: 'DNI', number: dni }, numberOfPlans: plans, siteId, leadIds, registration: true };
}

async function createCapitadoAccount(siteId, plans, email, password, addPet) {
    const token = await getAuthToken();
    const dni = randomDni();
    await registerCapitadoWithFreshCupon(token, siteId, email, dni);

    // Para Capitado, numberOfPlans siempre 1 por registro (un cupón = un plan)
    // Si se piden más planes, hay que repetir el flow con cupones distintos
    const leadIds = [];
    for (let i = 1; i < plans; i++) {
        const email2 = randomEmail('test2');
        await registerCapitadoWithFreshCupon(token, siteId, email2, dni);
        leadIds.push(email2); // Guardamos emails extra como referencia
    }

    return { email, password, identification: { type: 'DNI', number: dni }, numberOfPlans: plans, siteId, leadIds, registration: true };
}

async function createAccount(siteId, plans, addPet, email, password) {
    console.log(`\n🔧 Creando cuenta ${siteId} — ${plans} plan(es)${addPet ? ' + mascota' : ''}`);
    email = email || randomEmail('test');
    password = password || randomPassword();

    let user;
    if (SITE_IDS[siteId].type === 'adquirente') {
        user = await createAdquirenteAccount(siteId, plans, email, password);
    } else if (SITE_IDS[siteId].type === 'capitado') {
        user = await createCapitadoAccount(siteId, plans, email, password, addPet);
    } else {
        throw new Error(`SiteId ${siteId} no tiene flow de creación implementado`);
    }

    const freshUser = {
        id: uuidv4(),
        siteId: user.siteId,
        email: user.email,
        password: user.password,
        identification: user.identification,
        numberOfPlans: user.numberOfPlans,
        leadIds: user.leadIds,
        registration: user.registration,
        source: 'fresh',
        tags: ['UNREGISTERED', 'NO_PET', 'PLAN_WITHOUT_PET'],
    };

    addFreshUser(freshUser);

    console.log(`✅ Cuenta creada y guardada en fresh-users.json:`);
    console.log(`   Email: ${freshUser.email}`);
    console.log(`   Password: ${freshUser.password}`);
    console.log(`   DNI: ${freshUser.identification.number}`);
    console.log(`   SiteId: ${freshUser.siteId}`);
    console.log(`   Planes: ${freshUser.numberOfPlans}`);
    console.log(`   Tags: ${freshUser.tags.join(', ')}`);

    return freshUser;
}

function listFreshAccounts() {
    const state = readFreshUsers();
    const result = {};
    for (const [siteId, users] of Object.entries(state.users)) {
        result[siteId] = users.map((u) => ({
            email: u.email,
            siteId: u.siteId,
            numberOfPlans: u.numberOfPlans,
            tags: u.tags,
            identification: u.identification,
        }));
    }
    return result;
}

async function main() {
    const args = parseArgs();

    if (args.allTypes) {
        console.log('\n=== Creando 1 cuenta de cada tipo ===');
        for (const siteId of Object.keys(SITE_IDS)) {
            if (siteId === 'IKE_WEBAPP') continue; // No tiene flow público
            try {
                await createAccount(siteId, args.plans, args.addPet, null, null);
            } catch (e) {
                console.error(`❌ Error creando ${siteId}:`, e.message);
            }
        }
    } else {
        if (!SITE_IDS[args.site]) {
            console.error(`❌ SiteId inválido: ${args.site}`);
            printHelp();
            process.exit(1);
        }
        await createAccount(args.site, args.plans, args.addPet, args.email, args.password);
    }

    console.log('\n🎉 Listo. Las cuentas están disponibles via UserProvider.getUser({ source: "fresh", ... })');
}

// Solo correr main() cuando se invoca como CLI directo (no cuando account-creator-mcp.mjs importa
// las funciones de este archivo para exponerlas como server MCP).
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
    main().catch((e) => {
        console.error('❌ Error fatal:', e);
        process.exit(1);
    });
}

export { createAccount, listFreshAccounts, SITE_IDS };
