import { SiteId } from '@config/environment';
import { getRandomInt } from '@helpers/automation-utils';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('Perfil Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Visualización y edición de perfil
    // =========================================================================
    test.describe('TS-01 Visualización y edición de perfil', () => {
        test.describe(() => {
            // Los 4 TCs comparten una sola cuenta pooled con ignoreReserved:true (sin reserva
            // exclusiva) — en paralelo, varios workers pisan el mismo playwright/auth/<id>.json al
            // mismo tiempo y el test aterriza en /auth/login (ver docs/lecciones-aprendidas.md,
            // entrada 2026-08-08 sobre storageState y paralelismo). Serial evita la carrera.
            test.describe.configure({ mode: 'serial' });
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-01 - Credencial - Vetify - Visualización del perfil', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.'],
                    steps: ['Navegar al perfil del usuario.'],
                    expectedResult: ['El perfil muestra avatar, nombre completo, DNI, email y el botón "Editar datos".'],
                });

                await step('1. Navegar al perfil del usuario.', async () => {
                    await container.vetify.webapp.myProfilePage.load();
                });
                await step('El perfil muestra avatar, nombre completo, DNI, email y el botón "Editar datos".', async () => {
                    await container.vetify.webapp.myProfilePage.verifyProfileDataVisible();
                    await expect(container.vetify.webapp.myProfilePage.emailLbl).toBeVisible();
                });
            });

            test('TC-02 - Credencial - Vetify - Cambiar imagen de perfil', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.'],
                    steps: ['Navegar al perfil.', 'Presionar "Editar datos".', 'Presionar el avatar y seleccionar una foto válida.', 'Guardar los cambios.'],
                    expectedResult: ['La foto de perfil se actualiza correctamente y persiste tras recargar la pantalla.'],
                });

                await step('1. Navegar al perfil.', async () => {
                    await container.vetify.webapp.myProfilePage.load();
                });
                await step('2. Presionar "Editar datos".', async () => {
                    await container.vetify.webapp.myProfilePage.openEditData();
                });

                let uploadResponse;
                await step('3. Presionar el avatar y seleccionar una foto válida.', async () => {
                    [uploadResponse] = await Promise.all([
                        page.waitForResponse((r) => r.url().includes('/api/files/upload') && r.status() === 200),
                        container.vetify.webapp.myProfilePage.changeProfilePhoto('src/fixtures/images/user-profile-photo.jpg'),
                    ]);
                });
                await step('4. Guardar los cambios.', async () => {
                    await container.vetify.webapp.myProfilePage.saveChanges();
                });
                await step('La foto de perfil se actualiza correctamente y persiste tras recargar la pantalla.', async () => {
                    expect(uploadResponse!.ok()).toBeTruthy();
                    await container.vetify.webapp.myProfilePage.load();
                    await expect(container.vetify.webapp.myProfilePage.avatarRoot.locator('img[data-state="visible"]')).toBeVisible();
                });
            });

            // Confirmado en vivo contra QA real (2026-08-08): POST /api/files/upload responde 200 para
            // CUALQUIER archivo (probado con un .txt), sin validar formato en el backend. Lo que hace
            // parecer que el sistema "rechaza" el archivo es un efecto colateral del componente Avatar de
            // Chakra: al no poder decodificar el .txt como imagen, oculta el <img> y muestra el fallback
            // de iniciales — no hay validación real ni mensaje de error. El archivo inválido queda
            // persistido igual si se presiona "Guardar" (por eso este test NO guarda: solo documenta la
            // respuesta del upload, sin corromper el perfil del usuario de prueba). Contradice el CP del
            // Excel ("El sistema solo permite la selección de imágenes (png, jpg, jpeg, webp)").
            test('TC-03 - [Bug conocido] [Negativo] Vetify - Cambiar imagen de perfil - formato inválido no se valida', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.'],
                    steps: ['Navegar al perfil.', 'Presionar "Editar datos".', 'Presionar el avatar y seleccionar un archivo que no sea imagen (.txt).'],
                    expectedResult: [
                        'BUG: el backend acepta el archivo (200) sin validar formato — no hay mensaje de error ni bloqueo real, solo el navegador no puede renderizar el archivo como imagen.',
                    ],
                });

                await step('1. Navegar al perfil.', async () => {
                    await container.vetify.webapp.myProfilePage.load();
                });
                await step('2. Presionar "Editar datos".', async () => {
                    await container.vetify.webapp.myProfilePage.openEditData();
                });

                let uploadResponse;
                await step('3. Presionar el avatar y seleccionar un archivo que no sea imagen (.txt).', async () => {
                    [uploadResponse] = await Promise.all([
                        page.waitForResponse((r) => r.url().includes('/api/files/upload')),
                        container.vetify.webapp.myProfilePage.changeProfilePhoto('src/fixtures/files/invalid-format.txt'),
                    ]);
                });
                await step('BUG: el backend acepta el archivo (200) sin validar formato.', async () => {
                    expect(uploadResponse!.status()).toBe(200);
                });
            });

            // Confirmado en vivo contra QA real (2026-08-08): a diferencia de lo que asume el CP original
            // del Excel ("El sistema permite cambiar Nombre, Apellido, Número de Identificación y Número
            // de teléfono"), en el modo "Editar datos" real SOLO el teléfono (y la dirección, fuera de
            // alcance de este CP) son editables. Nombre, apellido y DNI muestran un aviso fijo indicando
            // que deben corregirse llamando al 0800 122 1183 — no hay inputs para esos campos en absoluto.
            test('TC-04 - Credencial - Vetify - Actualizar datos personales (sólo teléfono es editable)', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.'],
                    steps: ['Navegar al perfil.', 'Presionar "Editar datos".', 'Completar el teléfono.', 'Guardar los cambios.'],
                    expectedResult: [
                        'Nombre, apellido y DNI NO son editables — el sistema muestra un aviso para corregirlos llamando al 0800 122 1183 (contradice el CP original del Excel).',
                        'El teléfono se actualiza correctamente y persiste tras recargar.',
                    ],
                });

                const areaCode = '11';
                const phoneNumber = getRandomInt(10000000, 99999999).toString();

                await step('1. Navegar al perfil.', async () => {
                    await container.vetify.webapp.myProfilePage.load();
                });
                await step('2. Presionar "Editar datos".', async () => {
                    await container.vetify.webapp.myProfilePage.openEditData();
                });
                await step('Nombre, apellido y DNI NO son editables — se muestra el aviso para llamar al 0800 122 1183.', async () => {
                    await expect(container.vetify.webapp.myProfilePage.correctDataNoticeLbl).toBeVisible();
                });
                await step('3. Completar el teléfono.', async () => {
                    await container.vetify.webapp.myProfilePage.updatePhone(areaCode, phoneNumber);
                });
                await step('4. Guardar los cambios.', async () => {
                    await container.vetify.webapp.myProfilePage.saveChanges();
                });
                await step('El teléfono se actualiza correctamente y persiste tras recargar.', async () => {
                    await container.vetify.webapp.myProfilePage.load();
                    await expect(container.vetify.webapp.myProfilePage.phoneLbl.filter({ hasText: phoneNumber })).toBeVisible();
                });
            });
        });
    });
});
