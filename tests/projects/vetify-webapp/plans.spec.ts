import { SiteId } from '@config/environment';
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
                await step('3. Presionar "Condiciones del Servicio".', async () => {
                    // Ni waitForLoadState() ni waitForURL() (con cualquier waitUntil) resuelven nunca
                    // para esta pestana -- navega directo a un PDF y el visor embebido de Chromium
                    // cuelga toda la maquinaria de deteccion de navegacion de Playwright. expect.poll
                    // sobre el getter url() puro evita depender de esa maquinaria por completo.
                    [newPage] = await Promise.all([page.context().waitForEvent('page'), container.vetify.webapp.myPlansPage.conditionsServiceBtn.click()]);
                    await expect.poll(() => newPage!.url()).toContain('atencionike.com.ar');
                });
                await step('Se abre una pestaña nueva con el documento de condicionado real.', async () => {
                    expect(newPage!.url()).toContain('atencionike.com.ar/pdf/condicionados/');
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
                await step('3. Presionar "Condiciones del Servicio".', async () => {
                    // Ver comentario en TC-01: expect.poll sobre url() evita la maquinaria de
                    // deteccion de navegacion de Playwright, que cuelga con esta pestana de PDF.
                    [newPage] = await Promise.all([page.context().waitForEvent('page'), container.vetify.webapp.myPlansPage.conditionsServiceBtn.click()]);
                    await expect.poll(() => newPage!.url()).toContain('atencionike.com.ar');
                });
                await step('El documento PDF es accesible (respuesta exitosa).', async () => {
                    const response = await newPage!.request.get(newPage!.url());
                    expect(response.ok()).toBeTruthy();
                    await newPage!.close();
                });
            });
        });
    });
});
