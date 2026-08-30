import { SiteId } from '@config/environment';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserProvider, UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Sesión Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Cierre de sesión
    // =========================================================================
    test.describe('TS-01 Cierre de sesión', () => {
        test.describe(() => {
            // reserve:true porque el test invalida la sesión (logout real) -- no puede compartirse con
            // otro test corriendo en paralelo sobre la misma cuenta.
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: true,
                },
            });

            test('TC-01 - Vetify - Cerrar sesión y bloqueo de acceso posterior', { tag: ['@critical'] }, async ({ container, page, user }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Abrir el menú lateral y presionar "Cerrar sesión".', 'Intentar navegar a una sección protegida.'],
                    expectedResult: ['La sesión se cierra y redirige a login.', 'El acceso a la sección protegida también redirige a login.'],
                });

                await step('1. Cargar Home para confirmar la sesión activa.', async () => {
                    await container.vetify.webapp.homePage.load();
                });

                await step('2. Cerrar sesión desde el menú lateral.', async () => {
                    await container.vetify.webapp.homePage.logout();
                });

                await step('La sesión se cierra y redirige a login.', async () => {
                    await expect(page).toHaveURL(/\/auth\/login/);
                });

                await step('3. Intentar navegar a una sección protegida tras el logout.', async () => {
                    await container.vetify.webapp.myPetsPage.load();
                });

                await step('El acceso a la sección protegida redirige a login.', async () => {
                    await expect(page).toHaveURL(/\/auth\/login/);
                });

                // La sesión cacheada (playwright/auth/<id>.json) quedó invalidada por el logout real --
                // sin esto, el próximo test que reuse esta cuenta aplicaría cookies muertas.
                if (user) {
                    UserProvider.clearUserStorageState(user);
                }
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 Persistencia y regresión de sesión
    // =========================================================================
    test.describe('TS-02 Persistencia y regresión de sesión', () => {
        test('TC-01 - Vetify - Acceso directo a ruta protegida sin autenticación', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Ningún usuario autenticado.'],
                steps: ['Navegar directamente a una URL protegida sin haber iniciado sesión.'],
                expectedResult: ['El sistema redirige a login, preservando la ruta original como parámetro.'],
            });

            await step('1. Navegar directamente a una ruta protegida.', async () => {
                await container.vetify.webapp.myPetsPage.load();
            });

            await step('El sistema redirige a login preservando la ruta original.', async () => {
                await expect(page).toHaveURL(/\/auth\/login\?prevPage=/);
            });
        });

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

            test('TC-02 - Vetify - Persistencia de sesión entre módulos', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Navegar entre al menos 2 secciones distintas.'],
                    expectedResult: ['La sesión persiste en todas las secciones, sin redirigir a login en ningún momento.'],
                });

                await step('1. Cargar Home.', async () => {
                    await container.vetify.webapp.homePage.load();
                });
                await step('2. Navegar a Mis Mascotas.', async () => {
                    await container.vetify.webapp.myPetsPage.load();
                });
                await step('3. Navegar a Mi Perfil.', async () => {
                    await container.vetify.webapp.myProfilePage.load();
                });
                await step('La sesión persiste en todas las secciones, sin redirigir a login.', async () => {
                    await expect(page).not.toHaveURL(/\/auth\/login/);
                    await expect(container.vetify.webapp.myProfilePage.emailLbl).toBeVisible();
                });
            });

            test('TC-03 - Vetify - Persistencia de sesión ante un refresh', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario logueado en la WebApp.'],
                    steps: ['Recargar la página por completo.'],
                    expectedResult: ['La sesión persiste, sin redirigir a login.'],
                });

                await step('1. Cargar Home.', async () => {
                    await container.vetify.webapp.homePage.load();
                });
                await step('2. Recargar la página.', async () => {
                    await page.reload();
                });
                await step('La sesión persiste, sin redirigir a login.', async () => {
                    await expect(page).not.toHaveURL(/\/auth\/login/);
                    await expect(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-03 Tour de onboarding
    // =========================================================================
    test.describe('TS-03 Tour de onboarding', () => {
        test.describe(() => {
            // El tour es un flag de backend por cuenta, no de browser -- una vez que este test corre en
            // verde, esa cuenta queda "vista" para siempre y el proximo run necesita otra cuenta ACTIVE
            // que nunca haya logueado. PLAN_WITHOUT_PET (sin filtrar por WITH_PET) amplia el universo de
            // candidatas -- no verificar manualmente cuales "vieron" el tour antes de correr el test:
            // loguearse a mano para chequear consume la cuenta igual que la corrida real (lección
            // aprendida en el momento, 2026-08-30 -- mismo patron que IMP-003).
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                    reserve: true,
                },
            });

            test('TC-01 - Vetify - Tour de onboarding en el primer login', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Cuenta que nunca completó el tour de bienvenida.'],
                    steps: ['Loguearse por primera vez.', 'Presionar "Comenzar" en el banner de bienvenida.', 'Avanzar los 3 pasos con "Continuar".'],
                    expectedResult: ['El tour muestra 3 pasos con contenido real y se cierra al finalizar.'],
                });

                await step('1. Cargar Home tras el primer login.', async () => {
                    await container.vetify.webapp.homePage.load();
                });
                await step('El banner de bienvenida con "Comenzar" es visible.', async () => {
                    await expect(container.vetify.webapp.homePage.tourWelcomeStartBtn).toBeVisible();
                });
                await step('2. Presionar "Comenzar" e iniciar el tour.', async () => {
                    await container.vetify.webapp.homePage.tourWelcomeStartBtn.click();
                });
                await step('Se muestra el paso 1 de 3.', async () => {
                    await expect(page.getByText('1 de 3')).toBeVisible();
                });
                await step('3. Avanzar al paso 2 con "Continuar".', async () => {
                    await container.vetify.webapp.homePage.tourNextBtn.click();
                });
                await step('Se muestra el paso 2 de 3.', async () => {
                    await expect(page.getByText('2 de 3')).toBeVisible();
                });
                await step('4. Avanzar al paso 3 con "Continuar".', async () => {
                    await container.vetify.webapp.homePage.tourNextBtn.click();
                });
                await step('Se muestra el paso 3 de 3.', async () => {
                    await expect(page.getByText('3 de 3')).toBeVisible();
                });
                await step('5. Finalizar el tour con "Continuar".', async () => {
                    await container.vetify.webapp.homePage.tourNextBtn.click();
                });
                await step('El tour se cierra, sin dejar ningún paso visible.', async () => {
                    await expect(page.getByText(/\d de 3/)).toBeHidden();
                });
            });
        });

        test.describe(() => {
            // reserve:true porque el test hace logout real a mitad de camino (mismo motivo que TS-01
            // TC-01) -- no puede compartirse con otro test en paralelo. Cualquier cuenta ACTIVE sirve,
            // el test maneja el tour si aparece en el primer login.
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: true,
                },
            });

            test('TC-02 - Vetify - Tour de onboarding no vuelve a aparecer en el segundo login', { tag: ['@critical'] }, async ({ container, user }) => {
                await setAllureDetails({
                    preconditions: ['Cuenta cualquiera del pool (el test maneja el tour si aparece).'],
                    steps: ['Loguearse y, si aparece el tour, omitirlo.', 'Cerrar sesión.', 'Loguearse de nuevo con la misma cuenta.'],
                    expectedResult: ['En el segundo login, el banner de bienvenida y el tour no aparecen.'],
                });

                await step('1. Cargar Home y omitir el tour si aparece (cuenta pudo no haberlo visto antes).', async () => {
                    await container.vetify.webapp.homePage.load();
                    if (await container.vetify.webapp.homePage.tourWelcomeStartBtn.isVisible().catch(() => false)) {
                        await container.vetify.webapp.homePage.tourWelcomeStartBtn.click();
                        await container.vetify.webapp.homePage.tourSkipBtn.click();
                    }
                });
                await step('2. Cerrar sesión.', async () => {
                    await container.vetify.webapp.homePage.logout();
                });
                await step('3. Loguearse de nuevo con la misma cuenta.', async () => {
                    if (user) {
                        await container.vetify.webapp.loginPage.login(user.email, user.password);
                    }
                });
                await step('El banner de bienvenida y el tour no vuelven a aparecer.', async () => {
                    await container.vetify.webapp.homePage.load();
                    await expect(container.vetify.webapp.homePage.tourWelcomeStartBtn).toBeHidden();
                });

                if (user) {
                    UserProvider.clearUserStorageState(user);
                }
            });
        });
    });
});
