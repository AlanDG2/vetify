import { SiteId } from '@config/environment';
import { mockAccountWithNoOperablePlan } from '@helpers/mockPlanState';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Estado del plan Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Único plan Inactivo o Dado de baja (IMAS-4408, escenarios 2/3)
    // =========================================================================
    test.describe('TS-01 Único plan Inactivo o Dado de baja', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test(
                'TC-01 - Vetify - Cuenta cuyo único plan no está operable no muestra ninguna credencial ni permite operar',
                { tag: ['@critical'] },
                async ({ container, page }) => {
                    await setAllureDetails({
                        preconditions: [
                            'Usuario cuyo único plan pasó a Inactivo (falta de pago) o fue Dado de baja definitivamente.',
                            'Simulado interceptando la respuesta real de /pets/my-products y /reintegros/mascotas (IMP-015: no existe forma de conseguir esta cuenta con datos reales, ver docs/conocimiento-sistema.md).',
                        ],
                        steps: ['Revisar Home, Mascotas, Planes y coberturas, Videollamada y Reintegros.'],
                        expectedResult: [
                            'Ninguna pantalla muestra una credencial ni permite operar, pero el login y el acceso a la WebApp siguen funcionando con normalidad.',
                        ],
                    });

                    await step('1. Simular que la cuenta no tiene ningún plan operable.', async () => {
                        await mockAccountWithNoOperablePlan(page);
                    });

                    await step('2. Cargar Home.', async () => {
                        await container.vetify.webapp.homePage.load();
                    });
                    await step('Login exitoso, sin credencial visible en Home.', async () => {
                        await expect(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                        await expect(container.vetify.webapp.homePage.petCredentialCards).toHaveCount(0);
                    });

                    await step('3. Ir a Mascotas.', async () => {
                        await container.vetify.webapp.myPetsPage.load();
                    });
                    await step('Mascotas no muestra ninguna credencial.', async () => {
                        await expect(container.vetify.webapp.myPetsPage.petCards).toHaveCount(0);
                    });

                    await step('4. Ir a Planes y coberturas.', async () => {
                        await container.vetify.webapp.myPlansPage.load();
                    });
                    await step('Planes y coberturas no lista ningún plan.', async () => {
                        await expect(container.vetify.webapp.myPlansPage.noPlansLbl).toBeVisible();
                    });

                    await step('5. Intentar agendar una videollamada.', async () => {
                        await container.vetify.webapp.videocallFormPage.load();
                        await container.vetify.webapp.videocallFormPage.scheduleNewVideocallBtn.click();
                    });
                    await step('El flujo de Videollamada bloquea por falta de credencial.', async () => {
                        await container.vetify.webapp.videocallFormPage.verifyMissingCredentialScreenVisible();
                    });

                    await step('6. Intentar iniciar un reintegro nuevo.', async () => {
                        await container.vetify.webapp.nuevoReintegroPage.load();
                    });
                    await step('Reintegros no ofrece ninguna mascota para operar.', async () => {
                        await expect(container.vetify.webapp.nuevoReintegroPage.noMascotasRegistradasLbl).toBeVisible();
                    });
                },
            );
        });
    });
});
