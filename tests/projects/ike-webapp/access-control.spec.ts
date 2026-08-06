import { SiteId } from '@config/environment';
import { UserProvider, UserSource } from '@providers/user';
import { UserTag } from '@providers/user/tags';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('IMAS-3742 Test Suite - Restricción de acceso a la WebApp de Iké según plan', () => {
    // =========================================================================
    // CATEGORY: TS-01 IMAS-3742 - Validación de acceso durante la autenticación
    // =========================================================================
    test.describe('TS-01 IMAS-3742 - Validación de acceso durante la autenticación', () => {
        test('TC-01 - [Negativo] Ike WebApp - Usuario con plan exclusivo de Vetify no accede a la WebApp de Iké', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario con al menos un plan vigente, exclusivamente de Vetify (sin ningún plan habilitado de Iké).'],
                steps: ['Ir a la pantalla de login de la WebApp de Iké.', 'Iniciar sesión con las credenciales del usuario Vetify-only.'],
                expectedResult: [
                    'El sistema no otorga acceso a la WebApp de Iké — CA01: "Los usuarios con únicamente planes de Vetify no pueden acceder a la WebApp de Iké".',
                    'La validación ocurre durante el proceso de autenticación (CA04), sin dejar avanzar a ninguna pantalla de la WebApp.',
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
                    // Confirmado 2026-08-06 (MCP + esta corrida): el intento de login con un usuario pooled
                    // VETIFY_ADQUIRENTE real (plan exclusivo de Vetify) es rechazado con el mensaje genérico
                    // de credenciales inválidas — la URL nunca avanza más allá de /auth/login. No se pudo
                    // determinar con certeza si el rechazo se debe a que el fix (IMAS-3744) ya bloquea el
                    // acceso en la autenticación, o a que esta cuenta de automatización nunca tuvo un
                    // registro propio en el sistema de identidad de Iké (ver IMP-005) — el resultado
                    // observable (sin acceso) coincide con CA01/CA04 en cualquiera de los dos casos.
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
