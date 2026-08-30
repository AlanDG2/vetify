import { SiteId } from '@config/environment';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Mascotas Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Detalle de mascota
    // =========================================================================
    test.describe('TS-01 Detalle de mascota', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    // numberOfPlans:1 excluye a proposito la unica cuenta ACTIVE+WITH_PET con 2 planes
                    // del pool -- confirmado en vivo 2026-08-30 que tiene datos degradados (0 mascotas
                    // visibles pese al tag WITH_PET). Ver qa-workspace/decision-log.md.
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-01 - Vetify - Ver el detalle completo de una mascota', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con al menos una mascota con credencial completa.'],
                    steps: ['Ir a Mis Mascotas.', 'Presionar la card de una mascota.'],
                    expectedResult: ['Se ve el detalle real de la mascota: nombre, raza, edad, plan asociado y botón "Bajar credencial".'],
                });

                await step('1. Ir a Mis Mascotas.', async () => {
                    await container.vetify.webapp.myPetsPage.load();
                });
                await step('2. Presionar la card de una mascota.', async () => {
                    await container.vetify.webapp.myPetsPage.openFirstPet();
                });
                await step('Se ve el detalle real de la mascota.', async () => {
                    await expect(container.vetify.webapp.viewPetPage.petNameLbl).toBeVisible();
                    await expect(container.vetify.webapp.viewPetPage.petBreedLbl).toBeVisible();
                    await expect(container.vetify.webapp.viewPetPage.petAgeLbl).toBeVisible();
                    await expect(container.vetify.webapp.viewPetPage.planNameLbl).toBeVisible();
                    await expect(container.vetify.webapp.viewPetPage.downloadCredentialBtn).toBeVisible();
                });
            });
        });
    });
});
