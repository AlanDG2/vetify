import { SiteId } from '@config/environment';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Navegación Test Suite', () => {
    test.describe(() => {
        test.use({
            userRequest: {
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                // numberOfPlans:1 excluye a proposito la unica cuenta con datos degradados del pool
                // (ver tests/projects/vetify-webapp/pets.spec.ts / qa-workspace/decision-log.md).
                numberOfPlans: 1,
                reserve: false,
                ignoreReserved: true,
            },
        });

        // =========================================================================
        // CATEGORY: TS-01 Navegación principal
        // =========================================================================
        test.describe('TS-01 Navegación principal', () => {
            test('TC-01 - Vetify - El menú lateral navega correctamente entre secciones', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Abrir el menú lateral y navegar a Mascotas, Perfil, Reintegros y Planes y coberturas, una por una.'],
                    expectedResult: ['Cada item del menú navega a su sección esperada, sin error.'],
                });

                // Confirmado en vivo 2026-08-30: solo Home tiene el trigger del menu lateral en su
                // propio header -- las subpantallas (Mascotas, Perfil, Reintegros, Planes y coberturas)
                // usan un header "Volver" sin acceso al menu. El patron real de navegacion es Home ->
                // abrir menu -> click item -> volver a Home -> repetir, no reabrir el menu desde la
                // subpantalla misma.
                await step('1. Cargar Home.', async () => {
                    await container.vetify.webapp.homePage.load();
                });

                await step('2. Ir a Mascotas desde el menú.', async () => {
                    await container.vetify.webapp.homePage.dismissErrorDialogIfPresent();
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.mascotasEntry.click();
                });
                await step('La sección de Mascotas carga correctamente.', async () => {
                    await expect(page).toHaveURL(/\/section\/mypets/);
                });

                await step('3. Volver a Home e ir a Perfil desde el menú.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await container.vetify.webapp.homePage.dismissErrorDialogIfPresent();
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.perfilEntry.click();
                });
                await step('La sección de Perfil carga correctamente.', async () => {
                    await expect(page).toHaveURL(/\/section\/myprofile/);
                });

                await step('4. Volver a Home e ir a Reintegros desde el menú.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await container.vetify.webapp.homePage.dismissErrorDialogIfPresent();
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.reintegrosEntry.click();
                });
                await step('La sección de Reintegros carga correctamente.', async () => {
                    await expect(page).toHaveURL(/\/section\/myreintegros/);
                });

                await step('5. Volver a Home e ir a Planes y coberturas desde el menú.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await container.vetify.webapp.homePage.dismissErrorDialogIfPresent();
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.planesYCoberturasEntry.click();
                });
                await step('La sección de Planes y coberturas carga correctamente.', async () => {
                    await expect(page).toHaveURL(/\/section\/myplans/);
                });

                await step('6. Volver a Home.', async () => {
                    await container.vetify.webapp.homePage.load();
                });
                await step('La sección de Inicio carga correctamente.', async () => {
                    await expect(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                });
            });
        });

        // =========================================================================
        // CATEGORY: TS-02 Prestadores y Red
        // =========================================================================
        test.describe('TS-02 Prestadores y Red', () => {
            test('TC-01 - Vetify - Acceso al mapa de veterinarias', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Abrir el menú lateral y presionar "Veterinarias".'],
                    expectedResult: ['Se abre un modal "Buscar veterinaria" con un mapa embebido.'],
                });

                await step('1. Cargar Home.', async () => {
                    await container.vetify.webapp.homePage.load();
                });
                await step('2. Abrir el menú y presionar Veterinarias.', async () => {
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.veterinariasEntry.click();
                });
                await step('Se abre el modal "Buscar veterinaria" con el mapa.', async () => {
                    await expect(container.vetify.webapp.veterinariasSearchModal.heading).toBeVisible();
                    await expect(container.vetify.webapp.veterinariasSearchModal.locationInput).toBeVisible();
                });
            });

            test('TC-02 - Vetify - Búsqueda de veterinarias por ubicación', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Modal "Buscar veterinaria" abierto.'],
                    steps: ['Escribir una ubicación real en el buscador.'],
                    expectedResult: ['Aparecen sugerencias reales de ubicación para elegir.'],
                });

                await step('1. Cargar Home y abrir el modal de veterinarias.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await container.vetify.webapp.homePage.dismissErrorDialogIfPresent();
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.veterinariasEntry.click();
                });
                await step('2. Escribir una ubicación real.', async () => {
                    await container.vetify.webapp.veterinariasSearchModal.searchLocation('Palermo, Buenos Aires');
                });
                await step('Aparecen sugerencias reales de ubicación.', async () => {
                    await expect(container.vetify.webapp.veterinariasSearchModal.locationSuggestions.first()).toBeVisible();
                });
            });
        });

        // =========================================================================
        // CATEGORY: TS-03 Ayuda
        // =========================================================================
        test.describe('TS-03 Ayuda', () => {
            test('TC-01 - Vetify - Canales de contacto', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Abrir el menú lateral y presionar "Ayuda".'],
                    expectedResult: ['Se muestran los canales de contacto: Emergencias y Atención al cliente.'],
                });

                await step('1. Cargar Home.', async () => {
                    await container.vetify.webapp.homePage.load();
                });
                await step('2. Abrir el menú y presionar Ayuda.', async () => {
                    await container.vetify.webapp.homePage.openSideMenu();
                    await container.vetify.webapp.sideMenuSection.ayudaEntry.click();
                });
                await step('Se muestran los canales de contacto.', async () => {
                    await expect(page).toHaveURL(/\/section\/ayuda/);
                    // Varios textos de esta pantalla estan duplicados (resumen responsive, mismo patron
                    // ya visto en otras pantallas) y el indice visible no es estable (a veces 0, a veces
                    // 1) -- se filtra por visibilidad real con el pseudo-selector :visible en vez de
                    // asumir un indice fijo.
                    await expect(page.locator('p:visible', { hasText: 'Atención al cliente' })).toBeVisible();
                    await expect(page.locator('p:visible', { hasText: '+54 9 11 7248 7444' })).toBeVisible();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-04 Compatibilidad de permisos por plan
    // =========================================================================
    test.describe('TS-04 Compatibilidad de permisos por plan', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-01 - Vetify - Cuenta Adquirente ve el ítem "Vetify Plus" en el menú', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario Vetify Adquirente logueado.'],
                    steps: ['Abrir el menú lateral.'],
                    expectedResult: ['El ítem "Vetify Plus" es visible (regla de negocio: aplica a todos los productos menos OSDE).'],
                });

                await step('1. Cargar Home y abrir el menú.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await container.vetify.webapp.homePage.openSideMenu();
                });
                await step('El ítem "Vetify Plus" es visible.', async () => {
                    await expect(container.vetify.webapp.sideMenuSection.vetifyPlusEntry).toBeVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.OSDE_CAPITADO,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-02 - [Negativo] Vetify - Cuenta OSDE Capitado NO ve el ítem "Vetify Plus"', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario OSDE Capitado logueado.'],
                    steps: ['Abrir el menú lateral.'],
                    expectedResult: ['El ítem "Vetify Plus" NO aparece (regla de negocio: no aplica a OSDE).'],
                });

                await step('1. Cargar Home y abrir el menú.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await container.vetify.webapp.homePage.openSideMenu();
                });
                await step('El ítem "Vetify Plus" no aparece.', async () => {
                    await expect(container.vetify.webapp.sideMenuSection.vetifyPlusEntry).toBeHidden();
                });
            });
        });
    });
});
