import { SiteId } from '@config/environment';
import { wait } from '@helpers/automation-utils';
import { expect } from '@playwright/test';
import { TestUser, UserProvider, UserSource, UserTag } from '@providers/user';
import { UserFactory } from '@providers/user/user-factory';
import { setAllureDetails, test } from '@tests/framework/base-test';
import { step } from 'allure-js-commons';
import { activateFreshAccounts } from '../../setup/account-activation-setup';

// IMAS-4490 (subtarea de IMAS-4488): condicionados de OSDE Adquirente reemplazados (sin "Vetify
// Plus"). Diseño completo + ejecución manual de los 11 CPs en
// docs/user-stories/IMAS-4490-prueba-qa-condicionados-osde.tests.md (100% PASS manual, 2026-09-02 a
// 09-10). Este spec es la automatización, escrita recién ahora (2026-09-14) porque hasta hoy
// OSDE_ADQUIRENTE no podía generar cuentas nuevas (IMP-017, ya resuelto) y el catálogo QA real
// (cuenta=MA_VETIFY) solo carga 1 de los 9 planes necesarios (IMP-017, sigue abierto). Los CPs cuyo
// plan no está en el catálogo hoy, y para los que tampoco existe una cuenta real ya creada en el
// pool, quedan test.skip() citando IMP-017 en vez de fabricarse como "pasando".
const PDF_PATH = 'atencionike.com.ar/pdf/condicionados/';

test.describe('OSDE Adquirente - Condicionados Test Suite', () => {
    // =========================================================================
    // TS-01 Condicionado plan Classic x1 OSDE (clCuenta 2358) — único plan disponible hoy en el
    // catálogo real, cuenta generada fresca para este spec.
    // =========================================================================
    test.describe('TS-01 Condicionado Classic x1 OSDE (2358)', () => {
        test.describe.configure({ retries: 0, mode: 'serial' });
        let user: TestUser | undefined;

        test.beforeAll(async () => {
            // Reusar una cuenta Fresh ya ACTIVE del pool si quedó una de una corrida anterior (evita
            // comprar de más). Si no hay ninguna, generar una nueva.
            user = await UserProvider.getUser({
                source: UserSource.Fresh,
                siteId: SiteId.OSDE_ADQUIRENTE,
                tags: [UserTag.ACTIVE],
                reserve: false,
                ignoreReserved: true,
            });

            if (!user) {
                // 20 min: tiempo suficiente para generar + esperar propagación + activar.
                test.setTimeout(20 * 60 * 1000);

                const created = await UserFactory.generateTestUsers([
                    { siteId: SiteId.OSDE_ADQUIRENTE, planId: '2358', registration: true, configLabel: 'IMAS-4490-classic-2358' },
                ]);
                test.skip(!created['IMAS-4490-classic-2358'], 'No se pudo generar la cuenta OSDE Adquirente con plan 2358 -- ver IMP-017 en docs/impedimentos-bloqueos.md.');

                // Hallazgo real 2026-09-14: una cuenta recién comprada (lead+pago confirmados por API
                // hace segundos) falla la validación de póliza (identification/DNI) en un loop de
                // redirects -- confirmado en vivo que la MISMA cuenta, reintentada ~15 min después sin
                // ningún cambio de código, activa limpio. Es el mismo fenómeno de "propagación de datos"
                // ya documentado en src/scripts/setup.ts (createUsers -> wait 15min -> recién ahí testear).
                // Sin este wait, activateFreshAccounts() cuelga 180s en un redirect a
                // /auth/login?prevPage=... que nunca resuelve. Ver docs/impedimentos-bloqueos.md.
                console.log('⏳ Esperando 15 min de propagación de datos antes de activar la cuenta recién comprada...');
                await wait(15 * 60 * 1000);

                await activateFreshAccounts();

                user = await UserProvider.getUser({
                    source: UserSource.Fresh,
                    siteId: SiteId.OSDE_ADQUIRENTE,
                    tags: [UserTag.ACTIVE],
                });
            }
            test.skip(!user, 'La cuenta se generó pero no se pudo activar en la webapp (ver logs de activateFreshAccounts).');
        });

        test.beforeEach(async ({ container }) => {
            await step('Login con la cuenta recién generada (plan Classic x1 OSDE).', async () => {
                await container.vetify.webapp.loginPage.load();
                await container.vetify.webapp.loginPage.login(user!.email, user!.password);
            });
        });

        test('CP01 - OSDE Adquirente - Condicionado del plan Classic x1 OSDE (2358)', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario OSDE Adquirente con plan Vetify Classic x1 OSDE (clCuenta 2358), en "Planes y coberturas".'],
                steps: ['Ir a Planes y coberturas.', 'Expandir el plan.', 'Presionar "Condiciones del Servicio".'],
                expectedResult: ['Se abre una pestaña nueva con el PDF real del condicionado Classic OSDE (0158-2358.pdf), accesible (200 OK).'],
            });

            await step('1. Ir a Planes y coberturas.', async () => {
                await container.vetify.webapp.myPlansPage.load();
            });
            await step('2. Expandir el plan.', async () => {
                await container.vetify.webapp.myPlansPage.expandFirstPlan();
            });

            let newPage;
            let pdfResponse;
            await step('3. Presionar "Condiciones del Servicio".', async () => {
                // Mismo patrón que tests/projects/vetify-webapp/plans.spec.ts TC-01 (falso positivo
                // retractado 2026-09-10, ver BUG-036): se verifica por la respuesta de red del contexto,
                // no por newPage.url(), que nunca se actualiza para el visor de PDF embebido.
                [newPage, pdfResponse] = await Promise.all([
                    page.context().waitForEvent('page'),
                    page.context().waitForEvent('response', (r) => r.url().includes(PDF_PATH)),
                    container.vetify.webapp.myPlansPage.conditionsServiceBtn.click(),
                ]);
            });
            await step('Se abre el PDF real del condicionado Classic OSDE, accesible.', async () => {
                expect(pdfResponse!.url()).toContain(PDF_PATH);
                expect(pdfResponse!.url()).toContain('2358');
                expect(pdfResponse!.ok()).toBeTruthy();
                await newPage!.close();
            });
        });
    });

    // =========================================================================
    // TS-02 Condicionado plan Emergencias x1 OSDE (clCuenta 2364) — cuentas reales ya existentes en
    // el pool (no requieren generación nueva, el catálogo no entra en juego).
    // =========================================================================
    test.describe('TS-02 Condicionado Emergencias x1 OSDE (2364)', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.OSDE_ADQUIRENTE,
                    tags: [UserTag.ACTIVE],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('CP07 - OSDE Adquirente - Condicionado del plan Emergencias x1 OSDE (2364)', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario OSDE Adquirente con plan Vetify Emergencias x1 OSDE (clCuenta 2364), en "Planes y coberturas".'],
                    steps: ['Ir a Planes y coberturas.', 'Expandir el plan.', 'Presionar "Condiciones del Servicio".'],
                    expectedResult: ['Se abre una pestaña nueva con el PDF real del condicionado Emergencias OSDE (0158-2364.pdf), accesible (200 OK).'],
                });

                await step('1. Ir a Planes y coberturas.', async () => {
                    await container.vetify.webapp.myPlansPage.load();
                });
                await step('2. Expandir el plan.', async () => {
                    await container.vetify.webapp.myPlansPage.expandFirstPlan();
                });

                let newPage;
                let pdfResponse;
                await step('3. Presionar "Condiciones del Servicio".', async () => {
                    [newPage, pdfResponse] = await Promise.all([
                        page.context().waitForEvent('page'),
                        page.context().waitForEvent('response', (r) => r.url().includes(PDF_PATH)),
                        container.vetify.webapp.myPlansPage.conditionsServiceBtn.click(),
                    ]);
                });
                await step('Se abre el PDF real del condicionado Emergencias OSDE, accesible.', async () => {
                    expect(pdfResponse!.url()).toContain(PDF_PATH);
                    expect(pdfResponse!.url()).toContain('2364');
                    expect(pdfResponse!.ok()).toBeTruthy();
                    await newPage!.close();
                });
            });
        });
    });

    // =========================================================================
    // TS-03 Regresión — OSDE Capitado (CP10) y VET no-OSDE (CP11): confirman que el resto de
    // segmentos no fue tocado por el reemplazo de condicionados OSDE Adquirente.
    // =========================================================================
    test.describe('TS-03 Regresión — otros segmentos no afectados', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.OSDE_CAPITADO,
                    tags: [UserTag.ACTIVE],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('CP10 - OSDE Capitado - Condicionado sin cambios (regresión)', async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario OSDE Capitado con plan activo, en "Planes y coberturas".'],
                    steps: ['Ir a Planes y coberturas.', 'Expandir el plan.', 'Presionar "Condiciones del Servicio".'],
                    expectedResult: ['El PDF sigue siendo el mismo de siempre (Esencial OSDE), accesible (200 OK) -- IMAS-4488 no debía tocar Capitado.'],
                });

                await step('1. Ir a Planes y coberturas.', async () => {
                    await container.vetify.webapp.myPlansPage.load();
                });
                await step('2. Expandir el plan.', async () => {
                    await container.vetify.webapp.myPlansPage.expandFirstPlan();
                });

                let newPage;
                let pdfResponse;
                await step('3. Presionar "Condiciones del Servicio".', async () => {
                    [newPage, pdfResponse] = await Promise.all([
                        page.context().waitForEvent('page'),
                        page.context().waitForEvent('response', (r) => r.url().includes(PDF_PATH)),
                        container.vetify.webapp.myPlansPage.conditionsServiceBtn.click(),
                    ]);
                });
                await step('El condicionado de OSDE Capitado sigue accesible, sin cambios.', async () => {
                    expect(pdfResponse!.url()).toContain(PDF_PATH);
                    expect(pdfResponse!.ok()).toBeTruthy();
                    await newPage!.close();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('CP11 - Vetify (no-OSDE) - Condicionado sin cambios (regresión)', async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario Vetify Adquirente (plan VET puro, no OSDE) con plan activo, en "Planes y coberturas".'],
                    steps: ['Ir a Planes y coberturas.', 'Expandir el plan.', 'Presionar "Condiciones del Servicio".'],
                    expectedResult: ['El PDF de un plan VET puro sigue accesible con normalidad (200 OK) -- IMAS-4488 no aplica a planes no-OSDE.'],
                });

                await step('1. Ir a Planes y coberturas.', async () => {
                    await container.vetify.webapp.myPlansPage.load();
                });
                await step('2. Expandir el plan.', async () => {
                    await container.vetify.webapp.myPlansPage.expandFirstPlan();
                });

                let newPage;
                let pdfResponse;
                await step('3. Presionar "Condiciones del Servicio".', async () => {
                    [newPage, pdfResponse] = await Promise.all([
                        page.context().waitForEvent('page'),
                        page.context().waitForEvent('response', (r) => r.url().includes(PDF_PATH)),
                        container.vetify.webapp.myPlansPage.conditionsServiceBtn.click(),
                    ]);
                });
                await step('El condicionado del plan VET no-OSDE sigue accesible, sin cambios.', async () => {
                    expect(pdfResponse!.url()).toContain(PDF_PATH);
                    expect(pdfResponse!.ok()).toBeTruthy();
                    await newPage!.close();
                });
            });
        });
    });

    // =========================================================================
    // TS-04 Planes sin cuenta disponible hoy — el catálogo QA real (cuenta=MA_VETIFY) solo carga el
    // plan 2358 (ver IMP-017 en docs/impedimentos-bloqueos.md); ninguno de estos 7 planes tiene una
    // cuenta real ya creada en el pool tampoco. Se documentan como test.skip() explícito en vez de
    // omitirse en silencio, para que el spec quede estructuralmente completo para los 11 CPs del
    // diseño original y quede visible en el reporte qué falta y por qué.
    // =========================================================================
    test.describe('TS-04 Planes sin cuenta disponible hoy (IMP-017)', () => {
        const pendientes: { cp: string; plan: string; clCuenta: string }[] = [
            { cp: 'CP02', plan: 'Classic +1 OSDE', clCuenta: '2359' },
            { cp: 'CP03', plan: 'Cachorro x1 OSDE', clCuenta: '2360' },
            { cp: 'CP04', plan: 'Cachorro +1 OSDE', clCuenta: '2361' },
            { cp: 'CP05', plan: 'Premium x1 OSDE', clCuenta: '2362' },
            { cp: 'CP06', plan: 'Premium +1 OSDE', clCuenta: '2363' },
            { cp: 'CP08', plan: 'Emergencias +1 OSDE', clCuenta: '2365' },
            { cp: 'CP09', plan: 'Esencial OSDE', clCuenta: '2349' },
        ];

        for (const { cp, plan, clCuenta } of pendientes) {
            test(`${cp} - OSDE Adquirente - Condicionado del plan ${plan} (${clCuenta})`, async () => {
                test.skip(
                    true,
                    `IMP-017: el catálogo QA real (cuenta=MA_VETIFY) no tiene el plan ${clCuenta} cargado hoy, y no existe ninguna cuenta OSDE Adquirente real en el pool con este plan -- ver docs/impedimentos-bloqueos.md. Verificado manualmente (PASS) el 2026-09-10 por link directo al PDF -- ver docs/user-stories/IMAS-4490-prueba-qa-condicionados-osde.tests.md.`,
                );
            });
        }
    });
});
