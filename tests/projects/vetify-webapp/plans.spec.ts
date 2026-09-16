import { SiteId } from '@config/environment';
import { mockFirstPlanWithoutCondicionado } from '@helpers/mockPlanState';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Planes y Coberturas Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Condicionado del plan
    // =========================================================================
    test.describe('TS-01 Condicionado del plan', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    // numberOfPlans:1 excluye a proposito la unica cuenta con datos degradados del pool
                    // (ver pets.spec.ts / decision-log.md).
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-01 - Vetify - Consultar el condicionado del plan', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un plan activo.'],
                    steps: ['Ir a Planes y coberturas.', 'Expandir el plan.', 'Presionar "Condiciones del Servicio".'],
                    expectedResult: ['Se abre una pestaña nueva con el documento de condicionado real.'],
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
                    // CORRECCION 2026-09-10 (era un falso positivo, no un bug de producto): el
                    // visor de PDF embebido de Chromium nunca dispara los eventos de carga/navegacion
                    // que Playwright usa para poblar newPage.url() -- confirmado en vivo que el boton
                    // SI navega bien (click real de usuario y via MCP van directo al PDF correcto),
                    // pero newPage.url() queda pegado en ":" indefinidamente sin importar cuanto se
                    // espere. Se verifica la navegacion real via la respuesta de red del contexto del
                    // browser, no via el objeto Page de la pestana nueva -- eso si es confiable
                    // independientemente del visor de PDF. Ver docs/bugs/BUG-036 (retractado).
                    [newPage, pdfResponse] = await Promise.all([
                        page.context().waitForEvent('page'),
                        page.context().waitForEvent('response', (r) => r.url().includes('atencionike.com.ar/pdf/condicionados/')),
                        container.vetify.webapp.myPlansPage.conditionsServiceBtn.click(),
                    ]);
                });
                await step('Se abre una pestaña nueva con el documento de condicionado real.', async () => {
                    expect(pdfResponse!.url()).toContain('atencionike.com.ar/pdf/condicionados/');
                    expect(pdfResponse!.ok()).toBeTruthy();
                    await newPage!.close();
                });
            });

            test('TC-02 - Vetify - Descargar el condicionado del plan', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un plan activo.'],
                    steps: ['Ir a Planes y coberturas.', 'Expandir el plan.', 'Presionar "Condiciones del Servicio".'],
                    expectedResult: ['La pestaña nueva navega a un documento PDF real y accesible (respuesta exitosa).'],
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
                    // Ver comentario en TC-01 (falso positivo retractado 2026-09-10): se verifica
                    // por la respuesta de red del contexto en vez de newPage.url(), que nunca se
                    // actualiza para esta pestana de PDF.
                    [newPage, pdfResponse] = await Promise.all([
                        page.context().waitForEvent('page'),
                        page.context().waitForEvent('response', (r) => r.url().includes('atencionike.com.ar/pdf/condicionados/')),
                        container.vetify.webapp.myPlansPage.conditionsServiceBtn.click(),
                    ]);
                });
                await step('El documento PDF es accesible (respuesta exitosa).', async () => {
                    expect(pdfResponse!.ok()).toBeTruthy();
                    await newPage!.close();
                });
            });

            // IMP-020 (docs/impedimentos-bloqueos.md): no existe ninguna cuenta en el pool con un plan
            // real sin condicionado cargado -- se simula interceptando la respuesta real del endpoint
            // (ver mockFirstPlanWithoutCondicionado) en vez de depender de encontrar ese dato en el
            // catalogo real. Ver el comentario del helper para la limitacion conocida (no confirmado
            // visualmente el mensaje exacto por el outage de IMP-017 activo el dia que se escribio esto).
            test('TC-03 - Vetify - Plan sin condicionado disponible', async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un plan activo.', 'El plan no tiene condicionado cargado en el catálogo (simulado).'],
                    steps: ['Ir a Planes y coberturas.', 'Expandir el plan.'],
                    expectedResult: ['El botón "Condiciones del Servicio" no está disponible para ese plan.'],
                });

                await step('0. Simular que el plan no tiene condicionado cargado.', async () => {
                    await mockFirstPlanWithoutCondicionado(page);
                });
                await step('1. Ir a Planes y coberturas.', async () => {
                    await container.vetify.webapp.myPlansPage.load();
                });
                await step('2. Expandir el plan.', async () => {
                    await container.vetify.webapp.myPlansPage.expandFirstPlan();
                });
                await step('El botón "Condiciones del Servicio" no está disponible para ese plan.', async () => {
                    await expect(container.vetify.webapp.myPlansPage.conditionsServiceBtn).not.toBeVisible();
                });
            });
        });
    });
});
