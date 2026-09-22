import { SiteId } from '@config/environment';
import { UserProvider, UserSource } from '@providers/user';
import { UserTag } from '@providers/user/tags';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('IMAS-3742 Test Suite - Restricción de acceso a la WebApp de Iké según plan', () => {
    // =========================================================================
    // CATEGORY: TS-01 IMAS-3742 - Validación de acceso durante la autenticación
    // =========================================================================
    test.describe('TS-01 IMAS-3742 - Validación de acceso durante la autenticación', () => {
        test('TC-01 - IMAS-3742 - Usuario solo-Vetify (sin cuenta registrada en Iké) no accede', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario con al menos un plan vigente, exclusivamente de Vetify (sin ningún plan habilitado de Iké, y sin cuenta registrada en el sistema de identidad de Iké).'],
                steps: ['Ir a la pantalla de login de la WebApp de Iké.', 'Iniciar sesión con las credenciales del usuario Vetify-only.'],
                expectedResult: [
                    'El sistema no otorga acceso a la WebApp de Iké.',
                    'Nota de alcance: ver comentario técnico abajo sobre qué variante de CA01 cubre este caso.',
                ],
            });

            const user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE, UserTag.WITH_PET],
            });
            test.skip(user === undefined, 'No hay un usuario pooled VETIFY_ADQUIRENTE (ACTIVE, WITH_PET) disponible para reproducir el caso.');

            try {
                await step('1. Ir a la pantalla de login de la WebApp de Iké.', async () => {
                    await container.ike.webapp.loginPage.load();
                    await container.ike.webapp.loginPage.dismissCookieBannerIfPresent();
                });

                await step('2. Iniciar sesión con las credenciales del usuario Vetify-only.', async () => {
                    await container.ike.webapp.loginPage.login(user!.email, user!.password);
                });

                await step('El sistema no otorga acceso a la WebApp de Iké.', async () => {
                    // NOTA TÉCNICA 2026-08-07 (corrige la nota anterior del 2026-08-06): confirmado vía MCP
                    // que el rechazo NO es evidencia del fix de IMAS-3744. La llamada de login va a
                    // POST https://ike-webapp-staging.us.auth0.com/oauth/token — un tenant de Auth0 dedicado
                    // y separado del de Vetify — y responde 403 {"error":"invalid_grant","error_description":
                    // "Wrong email or password."}. Un email inventado que no existe en ningún lado produce
                    // EXACTAMENTE el mismo error. Es decir: Auth0 rechaza la credencial antes de que exista
                    // ninguna oportunidad de evaluar el plan del usuario — este test solo prueba que las
                    // cuentas del pool de Vetify nunca se registraron en el sistema de identidad de Iké
                    // (cierto incluso sin el fix), no que el control de acceso por plan esté funcionando.
                    //
                    // NOTA DE ALCANCE 2026-09-22: se reconfirmó en vivo el mismo resultado con una cuenta
                    // real de Vetify fuera del pool (pauscalzo@hotmail.com) usada específicamente para
                    // reproducir el incidente original de IMAS-3742 (usuario Vetify intentando entrar a la
                    // WebApp de Iké). La variante más estricta de CA01 (cuenta CON identidad ya registrada en
                    // el tenant de Auth0 de Iké pero SIN ningún plan de Iké asociado) sigue sin poder probarse
                    // con datos reales — Alan confirmó que no existe forma de generar ese estado salvo dando
                    // de baja un plan directo por base de datos, lo cual está fuera de alcance para QA. Se
                    // acepta este test como la evidencia práctica de CA01 para esta historia; la variante
                    // estricta queda documentada como impedimento permanente (no pendiente) — ver TC-06.
                    await container.ike.webapp.loginPage.errorMessageLbl.waitFor({ state: 'visible' });
                    await page.waitForURL(/\/auth\/login/);
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-02 - IMAS-3742 CA02 - Usuario con plan habilitado de Iké accede normalmente', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario con cuenta registrada en el tenant de Auth0 de Iké y un plan de Iké activo (sin plan de Vetify).'],
                steps: ['Ir a la pantalla de login de la WebApp de Iké.', 'Iniciar sesión con las credenciales del usuario.'],
                expectedResult: ['El sistema otorga acceso normal a la WebApp de Iké (pantalla de inicio "Mis asistencias"), sin pantallas intermedias de activación.'],
            });

            const user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.IKE_WEBAPP,
                tags: [UserTag.ACTIVE],
                numberOfPlans: 1,
            });
            test.skip(user === undefined, 'No hay un usuario pooled IKE_WEBAPP (ACTIVE, numberOfPlans:1 — solo plan de Iké) disponible.');

            try {
                await step('1. Ir a la pantalla de login de la WebApp de Iké.', async () => {
                    await container.ike.webapp.loginPage.load();
                    await container.ike.webapp.loginPage.dismissCookieBannerIfPresent();
                });

                await step('2. Iniciar sesión con las credenciales del usuario.', async () => {
                    await container.ike.webapp.loginPage.login(user!.email, user!.password);
                });

                await step('El sistema otorga acceso normal a la WebApp de Iké.', async () => {
                    await page.waitForURL(container.ike.webapp.homePage.getUrl());
                    await container.ike.webapp.homePage.dismissNotificationPromptIfPresent();
                    await container.ike.webapp.homePage.userDrawerBtn.waitFor({ state: 'visible' });
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-06 - [Fuera de alcance] IMAS-3742 CA01 - Usuario con cuenta en Iké pero SOLO plan de Vetify no accede', () => {
            test.skip(
                true,
                'Impedimento permanente, no pendiente (confirmado con Alan 2026-09-22): este estado (identidad ya registrada en el tenant de Auth0 de Iké, pero sin ningún plan de Iké asociado) no se puede generar por autoservicio — la única forma sería dar de baja un plan directo por base de datos, lo cual está fuera de alcance para QA. Evidencia práctica aceptada para CA01: ver TC-01 (usuario Vetify que nunca se registró en Iké, rechazado en el login).',
            );
        });

        test('TC-03 - IMAS-3742 CA03 - Usuario con planes de Vetify e Iké accede sin inconvenientes', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario con cuenta registrada en el tenant de Auth0 de Iké y con plan de Iké y plan de Vetify activos simultáneamente.'],
                steps: ['Ir a la pantalla de login de la WebApp de Iké.', 'Iniciar sesión con las credenciales del usuario.'],
                expectedResult: ['El sistema otorga acceso normal a la WebApp de Iké (pantalla de inicio "Mis asistencias"), sin pantallas intermedias de activación.'],
            });

            const user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.IKE_WEBAPP,
                tags: [UserTag.ACTIVE],
                numberOfPlans: 2,
            });
            test.skip(user === undefined, 'No hay un usuario pooled IKE_WEBAPP (ACTIVE, numberOfPlans:2 — Iké + Vetify) disponible.');

            try {
                await step('1. Ir a la pantalla de login de la WebApp de Iké.', async () => {
                    await container.ike.webapp.loginPage.load();
                    await container.ike.webapp.loginPage.dismissCookieBannerIfPresent();
                });

                await step('2. Iniciar sesión con las credenciales del usuario.', async () => {
                    await container.ike.webapp.loginPage.login(user!.email, user!.password);
                });

                await step('El sistema otorga acceso normal a la WebApp de Iké.', async () => {
                    await page.waitForURL(container.ike.webapp.homePage.getUrl());
                    await container.ike.webapp.homePage.dismissNotificationPromptIfPresent();
                    await container.ike.webapp.homePage.userDrawerBtn.waitFor({ state: 'visible' });
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-04 - [Fuera de alcance] IMAS-3742 - Usuario sin ningún plan (ni Vetify ni Iké) no accede', () => {
            test.skip(
                true,
                'Impedimento permanente, no pendiente (mismo motivo que TC-06, confirmado con Alan 2026-09-22): no hay forma de autoservicio para generar un usuario registrado sin ningún plan — solo dando de baja un plan directo por base de datos, fuera de alcance para QA.',
            );
        });

        // TC-05 (CA05 - "el cambio no afecta el login de otros tipos de usuario") no tiene test propio:
        // TC-02 y TC-03 ya ejercen el login real de los dos tipos de usuario con plan de Iké (solo Iké,
        // y Iké+Vetify) contra el ambiente post-fix — si ambos pasan, no hay regresión que reportar.
        // Ver nota similar en tests/projects/vetify-webapp/videocall.spec.ts:851.
    });
});
