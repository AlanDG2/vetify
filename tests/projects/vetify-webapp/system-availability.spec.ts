import { SiteId } from '@config/environment';
import { getRandomInt } from '@helpers/automation-utils';
import { NetworkOutageSimulator } from '@helpers/simulateOutage';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';
import { DateTime } from 'luxon';

test.describe('Sistema caído - Mensajes por indisponibilidad Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 IMAS-3860 - Escenario 1: Caída general del sistema
    // =========================================================================
    test.describe('TS-01 IMAS-3860 - Caída general del sistema', () => {
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

            test(
                'TC-01 - Sistema caído - Vetify - La pantalla de indisponibilidad aparece sin acciones y se oculta al restablecerse el servicio',
                { tag: ['@critical'] },
                async ({ container, page }) => {
                    await setAllureDetails({
                        preconditions: ['Usuario autenticado en Home.'],
                        steps: [
                            'Bloquear /api/brand/.../bootstrap (única llamada continua e independiente del heartbeat) y recargar la página.',
                            'Esperar a que el heartbeat detecte la caída (2 fallos consecutivos).',
                            'Restablecer el servicio sin recargar la página.',
                        ],
                        expectedResult: [
                            'La pantalla de indisponibilidad general reemplaza toda la navegación, sin botones ni enlaces (CA01, CA02).',
                            'Al restablecerse el servicio, la pantalla se oculta automáticamente sin intervención del usuario (CA03, regresión IMAS-4159).',
                        ],
                    });

                    const outage = new NetworkOutageSimulator(page);

                    await step('1. Iniciar sesión en Home y bloquear /bootstrap para simular una caída total del sistema.', async () => {
                        await container.vetify.webapp.homePage.load();
                        await outage.block(['*bootstrap*']);
                        await page.reload();
                    });

                    await step('CA01/CA02. La pantalla de indisponibilidad aparece y no presenta acciones.', async () => {
                        await expect(container.vetify.webapp.systemUnavailableComponent.heading).toBeVisible({ timeout: 25_000 });
                        await container.vetify.webapp.systemUnavailableComponent.expectVisible();
                        await container.vetify.webapp.systemUnavailableComponent.expectNoActions();
                    });

                    await step('2. Restablecer el servicio, sin recargar la página.', async () => {
                        await outage.restore();
                    });

                    await step('CA03. La pantalla se oculta automáticamente al restablecerse el servicio, sin intervención del usuario.', async () => {
                        await container.vetify.webapp.systemUnavailableComponent.expectHidden();
                    });
                },
            );
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

            test(
                'TC-02 - Sistema caído - Vetify - El aviso de indisponibilidad es consistente en todas las pantallas (regresión IMAS-4158)',
                { tag: ['@critical'] },
                async ({ container, page }) => {
                    await setAllureDetails({
                        preconditions: ['Usuario autenticado.'],
                        steps: ['Para cada pantalla de la WebApp: cargarla, bloquear /bootstrap y recargar.'],
                        expectedResult: ['El aviso de indisponibilidad general aparece en TODAS las pantallas, no solo en Home (CA06, CA07).'],
                    });

                    const outage = new NetworkOutageSimulator(page);

                    const screens: Array<{ name: string; load: () => Promise<void> }> = [
                        { name: 'Mis Mascotas', load: () => container.vetify.webapp.myPetsPage.load() },
                        { name: 'Mi Perfil', load: () => container.vetify.webapp.myProfilePage.load() },
                        { name: 'Servicios', load: () => container.vetify.webapp.servicesPage.load() },
                        { name: 'Mis Turnos (Historial de atención)', load: () => container.vetify.webapp.myAppointmentsPage.load() },
                        { name: 'Mis Planes (Planes y coberturas)', load: () => container.vetify.webapp.myPlansPage.load() },
                    ];

                    for (const screen of screens) {
                        await step(`CA06/CA07. El aviso de indisponibilidad general aparece en ${screen.name}.`, async () => {
                            await outage.restore();
                            await screen.load();
                            await outage.block(['*bootstrap*']);
                            await page.reload();
                            await expect(container.vetify.webapp.systemUnavailableComponent.heading).toBeVisible({ timeout: 25_000 });
                        });
                    }

                    await outage.restore();
                },
            );
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 IMAS-3860 - Escenario 2: Caída de una funcionalidad puntual (Videollamada)
    // =========================================================================
    test.describe('TS-02 IMAS-3860 - Caída de una funcionalidad puntual (Videollamada)', () => {
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

            test(
                'TC-01 - Videollamada caída - Vetify - Modal de funcionalidad no disponible con CTA "Ir al inicio"',
                { tag: ['@critical'] },
                async ({ container, page }) => {
                    await setAllureDetails({
                        preconditions: ['Usuario autenticado, con al menos una mascota con plan activo.'],
                        steps: [
                            'Completar el formulario de solicitud de videollamada hasta la pantalla de revisión.',
                            'Bloquear el POST de creación del turno (/api/services/assistance/493/create) y presionar "Confirmar videollamada".',
                            'Presionar "Ir al inicio" en el modal.',
                        ],
                        expectedResult: [
                            'El sistema muestra el modal de funcionalidad no disponible sobre la pantalla de revisión, sin reemplazarla (CA04).',
                            'El modal incluye el CTA "Ir al inicio" (CA05).',
                            'Al presionarlo, redirecciona correctamente al Home de Vetify (CA05).',
                        ],
                    });

                    // Nota: el disparador NO es ninguna de las llamadas GET que cargan el formulario (esas no
                    // contienen "493" en varios casos, y las que sí lo tienen no rompen nada si fallan) — es
                    // específicamente el POST final de creación del turno, que solo se dispara al presionar
                    // "Confirmar videollamada" en la pantalla de revisión. Confirmado vía MCP contra QA real
                    // 2026-08-07 tras descartar 3 intentos anteriores bloqueando en etapas más tempranas.
                    const outage = new NetworkOutageSimulator(page);

                    await step('1. Completar el formulario de solicitud de videollamada hasta la pantalla de revisión.', async () => {
                        await container.vetify.webapp.videocallFormPage.load();
                        await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                        await container.vetify.webapp.videocallFormPage.selectReason('Vacunas');
                        await container.vetify.webapp.videocallFormPage.clickContinue();
                        await container.vetify.webapp.videocallFormPage.skipAttachments();
                        await container.vetify.webapp.videocallFormPage.completeDayAndTime(DateTime.now().plus({ days: getRandomInt(1, 25) }));
                        await container.vetify.webapp.videocallFormPage.clickContinue();
                        await container.vetify.webapp.videocallFormPage.verifyReviewScreenSinglePet();
                    });

                    await step('2. Bloquear el POST de creación del turno y presionar "Confirmar videollamada".', async () => {
                        await outage.block(['*/services/assistance/493/create*']);
                        await container.vetify.webapp.videocallFormPage.confirmVideocallBtn.click();
                    });

                    await step('CA04/CA05. El modal de funcionalidad no disponible se muestra sobre la revisión, con el CTA "Ir al inicio".', async () => {
                        // CA04 ("modal sobre la pantalla actual", no un reemplazo total): confirmado visualmente
                        // vía captura de pantalla — la revisión queda atenuada detrás del modal, no reemplazada.
                        // No se afirma sobre su visibilidad con toBeVisible(): el fondo queda con aria-hidden
                        // mientras el diálogo está abierto (patrón de accesibilidad esperado para un modal), lo
                        // que hace que Playwright lo considere "no visible" aunque esté ahí en pantalla.
                        await container.vetify.webapp.featureUnavailableModal.expectVisible();
                    });

                    await step('3. Presionar "Ir al inicio".', async () => {
                        await container.vetify.webapp.featureUnavailableModal.goToHome();
                    });

                    await step('CA05. El sistema redirecciona correctamente al Home de Vetify.', async () => {
                        await expect(page).toHaveURL(container.vetify.webapp.homePage.getUrl());
                        await expect(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                    });

                    await outage.restore();
                },
            );
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

            test(
                'TC-02 - Videollamada caída - Vetify - El resto de la aplicación sigue operativo con la funcionalidad puntual caída',
                { tag: ['@critical'] },
                async ({ container, page }) => {
                    await setAllureDetails({
                        preconditions: ['Usuario autenticado.'],
                        steps: ['Con el servicio 493 (Videollamada) caído, navegar a Mis Mascotas.'],
                        expectedResult: ['Mis Mascotas carga con normalidad, sin verse afectada por la caída puntual de Videollamada (CA04).'],
                    });

                    const outage = new NetworkOutageSimulator(page);

                    await step('1. Bloquear el servicio 493 (Videollamada).', async () => {
                        await outage.block(['*/493*']);
                    });

                    await step('CA04. El resto de la aplicación sigue operando con normalidad.', async () => {
                        // No se usa waitForPageLoaded() acá: espera una respuesta de red *futura* a
                        // /api/users/me, pero esa llamada puede resolverse antes de registrar el listener
                        // (respuesta ya en curso o servida por el Service Worker) y el wait nunca resuelve
                        // aunque la pantalla ya esté completamente cargada. La visibilidad de petCards ya
                        // implica que la carga fue exitosa.
                        await container.vetify.webapp.myPetsPage.load();
                        await expect(container.vetify.webapp.myPetsPage.petCards.first()).toBeVisible();
                    });

                    await outage.restore();
                },
            );
        });
    });
});
