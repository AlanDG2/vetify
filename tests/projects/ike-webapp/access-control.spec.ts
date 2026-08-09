import { SiteId } from '@config/environment';
import { UserProvider, UserSource } from '@providers/user';
import { UserTag } from '@providers/user/tags';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('IMAS-3742 Test Suite - Restricción de acceso a la WebApp de Iké según plan', () => {
    // =========================================================================
    // CATEGORY: TS-01 IMAS-3742 - Validación de acceso durante la autenticación
    // =========================================================================
    test.describe('TS-01 IMAS-3742 - Validación de acceso durante la autenticación', () => {
        test('TC-01 - [No valida CA01] Ike WebApp - Usuario sin cuenta registrada en Iké es rechazado', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario con al menos un plan vigente, exclusivamente de Vetify (sin ningún plan habilitado de Iké, y sin cuenta registrada en el sistema de identidad de Iké).'],
                steps: ['Ir a la pantalla de login de la WebApp de Iké.', 'Iniciar sesión con las credenciales del usuario Vetify-only.'],
                expectedResult: [
                    'El sistema no otorga acceso a la WebApp de Iké.',
                    'IMPORTANTE: este caso NO valida CA01 — ver nota técnica abajo.',
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
                    // CA01 real sigue sin poder probarse — ver TC-06 (bloqueado, mismo IMP-005).
                    await container.ike.webapp.loginPage.errorMessageLbl.waitFor({ state: 'visible' });
                    await page.waitForURL(/\/auth\/login/);
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-02 - [Brecha de cobertura] IMAS-3742 CA02 - Usuario con plan habilitado de Iké accede normalmente', () => {
            test.skip(
                true,
                'IMP-005 (docs/impedimentos-bloqueos.md): no hay usuarios de prueba con plan de Iké en el pool ni forma de autoservicio para provisionarlos. Requiere backoffice de Iké.',
            );
        });

        test('TC-06 - [Brecha de cobertura] IMAS-3742 CA01 - Usuario con cuenta en Iké pero SOLO plan de Vetify no accede', () => {
            test.skip(
                true,
                'IMP-005 (docs/impedimentos-bloqueos.md): CA01 real requiere un usuario que SÍ tenga cuenta/identidad registrada en el tenant de Auth0 de Iké (ike-webapp-staging.us.auth0.com) pero sin ningún plan de Iké asociado — no un usuario que simplemente nunca se registró ahí (eso es lo que prueba TC-01, y no es lo mismo). Sin este usuario no se puede confirmar si el control de acceso por plan (IMAS-3744) funciona.',
            );
        });

        test('TC-03 - [Brecha de cobertura] IMAS-3742 CA03 - Usuario con planes de Vetify e Iké accede sin inconvenientes', () => {
            test.skip(
                true,
                'IMP-005 (docs/impedimentos-bloqueos.md): no hay usuarios de prueba con combinación Vetify+Iké en el pool.',
            );
        });

        test('TC-04 - [Brecha de cobertura] IMAS-3742 - Usuario sin ningún plan (ni Vetify ni Iké) no accede', () => {
            test.skip(
                true,
                'IMP-005 (docs/impedimentos-bloqueos.md): no hay un usuario de prueba sin ningún plan provisionado en el sistema de identidad de Iké para validar este caso puntual.',
            );
        });

        test('TC-05 - [Brecha de cobertura] IMAS-3742 CA05 - El cambio no afecta el login de otros tipos de usuario', () => {
            test.skip(
                true,
                'Requiere repetir TC-02/TC-03 (usuarios con plan de Iké) para confirmar que no hay regresión — bloqueado por el mismo IMP-005.',
            );
        });
    });
});
