import { SiteId } from '@config/environment';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Reintegros Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Acceso a Reintegros
    // =========================================================================
    test.describe('TS-01 Acceso a Reintegros', () => {
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

            test('TC-01 - Vetify - Acceso a la sección de Reintegros', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Ir a la sección de Reintegros.'],
                    expectedResult: ['Se ve la pantalla real de Reintegros: cuentas de acreditación, historial y botón "Nuevo reintegro".'],
                });

                await step('1. Ir a Reintegros.', async () => {
                    await container.vetify.webapp.reintegrosPage.load();
                    // Dialogo generico intermitente ("Algo salio mal") por flakiness de backend ya
                    // documentada (IMP-012/IMP-014) -- mientras esta abierto pone aria-hidden en el
                    // resto de la pagina y rompe cualquier getByRole().
                    await container.vetify.webapp.reintegrosPage.dismissErrorDialogIfPresent();
                });
                await step('Se ve la pantalla real de Reintegros.', async () => {
                    await expect(container.vetify.webapp.reintegrosPage.newReintegroBtn).toBeVisible();
                    await expect(container.vetify.webapp.reintegrosPage.cuentasDeAcreditacionHeading).toBeVisible();
                    await expect(container.vetify.webapp.reintegrosPage.misReintegrosHeading).toBeVisible();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 Consulta de estado de reintegro
    // =========================================================================
    test.describe('TS-02 Consulta de estado de reintegro', () => {
        test.describe(() => {
            // Unica cuenta OSDE Capitado del pool con historial real de reintegros (Pagado/Solicitado/
            // Desaprobado) -- confirmado en vivo 2026-08-30. Sin esto, "Acceder al historial" queda
            // deshabilitado (cuenta sin reintegros previos).
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.OSDE_CAPITADO,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-01 - OSDE Capitado - Consultar el historial de reintegros', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con reintegros previos ya cargados.'],
                    steps: ['Ir a Reintegros.', 'Presionar "Acceder al historial".'],
                    expectedResult: ['Se ve el historial real agrupado por estado (Pagado, Solicitado, Desaprobado).'],
                });

                await step('1. Ir a Reintegros.', async () => {
                    await container.vetify.webapp.reintegrosPage.load();
                    await container.vetify.webapp.reintegrosPage.dismissErrorDialogIfPresent();
                });
                await step('Los contadores por estado son visibles.', async () => {
                    await expect(container.vetify.webapp.reintegrosPage.pagadoCountLbl).toBeVisible();
                    await expect(container.vetify.webapp.reintegrosPage.solicitadoCountLbl).toBeVisible();
                    await expect(container.vetify.webapp.reintegrosPage.desaprobadoCountLbl).toBeVisible();
                });
                await step('2. Presionar "Acceder al historial".', async () => {
                    await expect(container.vetify.webapp.reintegrosPage.accederAlHistorialBtn).toBeEnabled();
                    await container.vetify.webapp.reintegrosPage.accederAlHistorialBtn.click();
                });
            });
        });
    });
});
