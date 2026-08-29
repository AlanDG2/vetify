import { SiteId } from '@config/environment';
import { getRandomEmail, getRandomIdentificationNumber, getRandomPassword } from '@helpers/automation-utils';
import { NetworkOutageSimulator } from '@helpers/simulateOutage';
import { EmailClient } from '@integrations/email/EmailClient';
import { VetifyWebappRegistrationPage } from '@pages/vetify/webapp';
import { expect, type Response } from '@playwright/test';
import { TestUser, UserProvider, UserSource, UserTag } from '@providers/user';
import { TestContainer, setAllureDetails, test } from '@tests/framework/base-test';
import { step } from 'allure-js-commons';

// 2026-08-29: pedir /api/passrecovery dos veces seguidas para el mismo email en poco tiempo
// reproducía "Enlace caducado" en el link recién recibido (confirmado en vivo, no es un bug del
// test: el flujo manual pausado funcionó 2/2 veces, el mismo flujo corrido en secuencia rápida
// falló consistentemente). Cooldown real entre requests para esta cuenta compartida hasta
// confirmar la ventana exacta con dev — ver qa-workspace/decision-log.md.
const RESET_REQUEST_COOLDOWN_MS = 90_000;
let lastResetRequestAt = 0;

async function waitForResetCooldown(): Promise<void> {
    const elapsed = Date.now() - lastResetRequestAt;
    if (lastResetRequestAt !== 0 && elapsed < RESET_REQUEST_COOLDOWN_MS) {
        await new Promise((resolve) => setTimeout(resolve, RESET_REQUEST_COOLDOWN_MS - elapsed));
    }
    lastResetRequestAt = Date.now();
}

/** Único uso: si `resetPassword` falla a mitad de camino, deja la cuenta compartida (UserTag.REAL_EMAIL)
 * con una contraseña desconocida para el resto de la suite — hay que restaurarla siempre. */
async function requestResetLink(container: TestContainer, email: string): Promise<string> {
    await waitForResetCooldown();
    const since = new Date();
    await container.vetify.webapp.loginPage.load();
    await container.vetify.webapp.loginPage.openForgotPassword();
    await container.vetify.webapp.loginPage.requestPasswordRecovery(email);
    const receivedEmail = await EmailClient.waitForEmail({
        from: 'webapp@vetify.com.ar',
        subjectContains: 'Recuperá tu contraseña',
        since,
    });
    // El link de reset aparece repetido varias veces en el cuerpo del correo (botón + fallback de
    // texto plano) — dedupe y filtrar por dominio, ignora otras URLs del correo (ej. el logo).
    const links = [...new Set(EmailClient.extractLinks(receivedEmail))].filter((link) => link.includes('reset-verify'));
    if (!links[0]) {
        throw new Error(`No se encontró el link de reset (reset-verify) en el correo recibido. Asunto: "${receivedEmail.subject}".`);
    }
    return links[0];
}

/** Restaura la contraseña conocida de la cuenta compartida vía un reset real adicional — nunca
 * asumir que la cuenta soporta quedar en una contraseña distinta a la del pool entre corridas. */
async function restorePassword(container: TestContainer, page: import('@playwright/test').Page, email: string, knownPassword: string): Promise<void> {
    const resetLink = await requestResetLink(container, email);
    await page.goto(resetLink);
    await container.vetify.webapp.resetPasswordPage.resetPassword(knownPassword);
    await expect(container.vetify.webapp.resetPasswordPage.successHeadingLbl).toBeVisible();
}

test.describe('Gestión de Usuario Test Suite', () => {
    test.describe('TS-01 Registración', () => {
        test('TC-01 Email ya existente', async ({ container }) => {
            const user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
                reserve: false,
                ignoreReserved: true,
            });
            test.skip(!user, 'No se pudo obtener un usuario registrado');
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema'],
                steps: [
                    'Abrir la página de registración de la WebApp',
                    'Ingresar un email de un usuario ya existente',
                    'Ingresar una contraseña en formato correcto',
                    'Presionar el botón "Crear cuenta"',
                ],
                expectedResult: [
                    'El sistema no realiza la registración del usuario',
                    'El Sistema muestra un mensaje de error indicando que ya existe un usuario con el correo ingresado',
                ],
            });
            let reponse: Response;
            await step('1. Abrir la página de registración de la WebApp', async () => {
                await container.vetify.webapp.registrationPage.load();
            });
            await step('2. Ingresar un email de un usuario ya existente', async () => {
                await container.vetify.webapp.registrationPage.emailInput.fill(user!.email);
            });
            await step('3. Ingresar una contraseña en formato correcto', async () => {
                await container.vetify.webapp.registrationPage.passwordInput.fill(getRandomPassword());
            });
            await step('4. Presionar el botón "Crear cuenta"', async () => {
                reponse = await container.vetify.webapp.registrationPage.clickRegistrationButton();
            });
            await step('El sistema no realiza la registración del usuario', async () => {
                expect.soft(reponse.status()).toBe(400);
                expect.soft(await reponse.json()).toStrictEqual({
                    message: 'Ya existe usuario asociado al mail ingresado',
                });
            });
            await step('El Sistema muestra un mensaje de error indicando que ya existe un usuario con el correo ingresado', async () => {
                const validationMessage = await container.vetify.webapp.registrationPage.getValidationMessage();
                expect.soft(validationMessage).toBe('Ya existe usuario asociado al mail ingresado');
            });
        });

        test('TC-02 Contraseña débil', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: [
                    'Abrir la página de registración de la WebApp',
                    'Ingresar un email que no esté asociado a ningún usuario registrado en el sistema',
                    'Ingresar una contraseña de menos de 8 caracteres, sin números ni caracteres especiales',
                    'Presionar el botón "Crear cuenta"',
                ],
                expectedResult: [
                    'El sistema no realiza la registración del usuario',
                    'El Sistema muestra un mensaje de error indicando que la contraseña es débil, además de indicar que es necesario para incrementar su fortaleza',
                ],
            });
            await step('1. Abrir la página de registración de la WebApp', async () => {
                await container.vetify.webapp.registrationPage.load();
            });
            await step('2. Ingresar un email que no esté asociado a ningún usuario registrado en el sistema', async () => {
                await container.vetify.webapp.registrationPage.emailInput.fill(getRandomEmail());
            });
            await step('3. Ingresar una contraseña de menos de 8 caracteres, sin números ni caracteres especiales', async () => {
                await container.vetify.webapp.registrationPage.passwordInput.fill('weak');
            });
            await step('4. Presionar el botón "Crear cuenta"', async () => {
                await container.vetify.webapp.registrationPage.submitButton.click();
            });
            await step('El sistema no realiza la registración del usuario', async () => {
                expect.soft(page.url()).toBe(container.vetify.webapp.registrationPage.getUrl());
            });
            await step(
                'El Sistema muestra un mensaje de error indicando que la contraseña es débil, además de indicar que es necesario para incrementar su fortaleza',
                async () => {
                    await expect.soft(page.getByText('Seguridad: Débil')).toBeVisible();
                },
            );
        });

        test('TC-04 Registración exitosa', async ({ container }) => {
            let response: Response;
            const registrationEmail = getRandomEmail();
            await setAllureDetails({
                preconditions: [],
                steps: [
                    'Abrir la página de registración de la WebApp',
                    'Ingresar un email que no esté asociado a ningún usuario registrado en el sistema',
                    'Ingresar una contraseña en formato correcto',
                    'Presionar el botón "Crear cuenta"',
                ],
                expectedResult: ['El sistema da de alta al usuario correctamente'],
            });
            await step('1. Abrir la página de registración de la WebApp', async () => {
                await container.vetify.webapp.registrationPage.load();
            });
            await step('2. Ingresar un email que no esté asociado a ningún usuario registrado en el sistema', async () => {
                await container.vetify.webapp.registrationPage.emailInput.fill(registrationEmail);
            });
            await step('3. Ingresar una contraseña en formato correcto', async () => {
                await container.vetify.webapp.registrationPage.passwordInput.fill(getRandomPassword());
            });
            await step('4. Presionar el botón "Crear cuenta"', async () => {
                response = await container.vetify.webapp.registrationPage.clickRegistrationButton();
            });
            await step('El sistema da de alta al usuario correctamente', async () => {
                expect.soft(response.status()).toBe(200);
                const responseBody = await response.json();
                expect.soft(responseBody.userId).toBeDefined();
                expect.soft(responseBody.email).toBe(registrationEmail);
            });
        });

        test('TC-03 Casos de Error - Sistema caído', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: [
                    'Abrir la página de registración de la WebApp y completar email y contraseña válidos.',
                    'Bloquear el endpoint de creación de usuario (simulando una caída del backend) y presionar "Crear cuenta".',
                ],
                expectedResult: ['El sistema muestra un mensaje de error y no registra al usuario.'],
            });
            const outage = new NetworkOutageSimulator(page);
            await step('1. Abrir la página de registración de la WebApp y completar email y contraseña válidos.', async () => {
                await container.vetify.webapp.registrationPage.load();
                await container.vetify.webapp.registrationPage.emailInput.fill(getRandomEmail());
                await container.vetify.webapp.registrationPage.passwordInput.fill(getRandomPassword());
            });
            await step('2. Bloquear el endpoint de creación de usuario y presionar "Crear cuenta".', async () => {
                await outage.block(['*/api/users/create*']);
                await container.vetify.webapp.registrationPage.submitButton.click();
            });
            await step('El sistema muestra un mensaje de error y no registra al usuario.', async () => {
                // Copy real confirmado en vivo (2026-08-07): distinto del genérico de recuperación de
                // contraseña ("problemas técnicos") — este formulario muestra su propio mensaje inline.
                await expect(page.getByText('Estamos teniendo inconvenientes en nuestros servicios. Intente nuevamente.')).toBeVisible({ timeout: 15_000 });
                expect(page.url()).toBe(container.vetify.webapp.registrationPage.getUrl());
            });
            await outage.restore();
        });

        test('TC-05 Campos obligatorios', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: ['Abrir la página de registración de la WebApp', 'Presionar el botón "Crear cuenta"'],
                expectedResult: ['El sistema muestra un mensaje de error indicando que los siguiente campos son obligatorios:' + '\n - Email' + '\n - Contraseña'],
            });
            await step('1. Abrir la página de registración de la WebApp', async () => {
                await container.vetify.webapp.registrationPage.load();
            });
            await step('2. Presionar el botón "Crear cuenta"', async () => {
                await container.vetify.webapp.registrationPage.submitButton.click();
            });
            await step('El sistema muestra un mensaje de error indicando que los siguiente campos son obligatorios: Email, Contraseña', async () => {
                expect.soft(page.url()).toBe(container.vetify.webapp.registrationPage.getUrl());
                await expect.soft(page.getByText('El correo electrónico no es válido')).toBeVisible();
            });
        });
    });

    test.describe('TS-02 Iniciar Sesión', () => {
        let user: TestUser | undefined;

        test.beforeAll(async () => {
            user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
                reserve: false,
                ignoreReserved: true,
            });
        });

        test('TC-01 Email existente - Contraseña Incorrecta', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema'],
                steps: [
                    'Abrir la página de inicio de sesión de la WebApp',
                    'Ingresar un email que no corresponda a un usuario registrado',
                    'Ingresar una contraseña',
                    'Presionar el botón "Iniciar Sesión"',
                ],
                expectedResult: ['El sistema muestra un mensaje de error indicando que el email o la contraseña son incorrectos'],
            });
            test.skip(!user, 'No se pudo obtener un usuario registrado');
            let response: Response;
            await step('Abrir la página de incio de sesión de la WebApp', async () => {
                await container.vetify.webapp.loginPage.load();
            });
            await step('Ingresar un email que no corresponda a un usuario registrado', async () => {
                await container.vetify.webapp.loginPage.emailInput.fill(user!.email);
            });
            await step('Ingresar una contraseña', async () => {
                await container.vetify.webapp.loginPage.passwordInput.fill(getRandomPassword());
            });
            await step('Presionar el botón "Iniciar Sesión"', async () => {
                response = await container.vetify.webapp.loginPage.clickLoginButton();
            });
            await step('El sistema muestra un mensaje de error indicando que el email o la contraseña son incorrectos', async () => {
                expect.soft(page.url()).toBe(container.vetify.webapp.loginPage.getUrl());
                await expect
                    .soft(container.vetify.webapp.loginPage.errorMessageLbl)
                    .toContainText('La contraseña y/o correo electrónico no es válido. ¿No tienes usuario? Crear cuenta.');
                expect.soft(await response.status()).toBe(403);
                expect.soft(await response.json()).toStrictEqual({
                    error: 'invalid_grant',
                    error_description: 'Wrong email or password.',
                });
            });
        });

        test('TC-02 Email no existente', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema'],
                steps: [
                    'Abrir la página de inicio de sesión de la WebApp',
                    'Ingresar el email que no corresponda a ningún usuario registrado',
                    'Ingresar una contraseña',
                    'Presionar el botón "Iniciar Sesión"',
                ],
                expectedResult: ['El sistema muestra un mensaje de error indicando que el email o la contraseña son incorrectos'],
            });
            let response: Response;
            await step('Abrir la página de incio de sesión de la WebApp', async () => {
                await container.vetify.webapp.loginPage.load();
            });
            await step('Ingresar el email que no corresponda a ningún usuario registrado', async () => {
                await container.vetify.webapp.loginPage.emailInput.fill(getRandomEmail());
            });
            await step('Ingresar una contraseña', async () => {
                await container.vetify.webapp.loginPage.passwordInput.fill(getRandomPassword());
            });
            await step('Presionar el botón "Iniciar Sesión"', async () => {
                response = await container.vetify.webapp.loginPage.clickLoginButton();
            });
            await step('El sistema muestra un mensaje de error indicando que el email o la contraseña son incorrectos', async () => {
                expect.soft(page.url()).toBe(container.vetify.webapp.loginPage.getUrl());
                await expect
                    .soft(container.vetify.webapp.loginPage.errorMessageLbl)
                    .toContainText('La contraseña y/o correo electrónico no es válido. ¿No tienes usuario? Crear cuenta.');
                expect.soft(await response.status()).toBe(403);
                expect.soft(await response.json()).toStrictEqual({
                    error: 'invalid_grant',
                    error_description: 'Wrong email or password.',
                });
            });
        });

        test('TC-03 Email existente - Contraseña correcta', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema'],
                steps: [
                    'Abrir la página de inicio de sesión de la WebApp',
                    'Ingresar el email de un usuario registrado',
                    'Ingresar la contraseña del usuario seleccionado en el paso 2',
                    'Presionar el botón "Iniciar Sesión"',
                ],
                expectedResult: ['El usuario inicia sesión correctamente en la WebApp'],
            });
            let response: Response;
            test.skip(!user, 'No se pudo obtener un usuario registrado');
            await step('Abrir la página de incio de sesión de la WebApp', async () => {
                await container.vetify.webapp.loginPage.load();
            });
            await step('Ingresar el email de un usuario registrado', async () => {
                await container.vetify.webapp.loginPage.emailInput.fill(user!.email);
            });
            await step('Ingresar la contraseña del usuario seleccionado en el paso 2', async () => {
                await container.vetify.webapp.loginPage.passwordInput.fill(user!.password);
            });
            await step('Presionar el botón "Iniciar Sesión"', async () => {
                response = await container.vetify.webapp.loginPage.clickLoginButton();
            });
            await step('El usuario inicia sesión correctamente en la WebApp', async () => {
                await page.waitForResponse((response) => response.url().includes('/api/bff/audit/login') && response.status() === 204);
                expect.soft(response.status()).toBe(200);
                const responseBody = await response.json();
                expect.soft(responseBody.access_token).toBeDefined();
                await expect.soft(page).not.toHaveURL(container.vetify.webapp.loginPage.getUrl());
            });
        });

        test('TC-04 Campos obligatorios', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: ['Abrir la página de inicio de sesión de la WebApp', 'Presionar el botón "Iniciar Sesión"'],
                expectedResult: ['El sistema muestra un mensaje de error indicando que los siguiente campos son obligatorios:\n' + ' - Email\n' + ' - Contraseña'],
            });
            await step('Abrir la página de incio de sesión de la WebApp', async () => {
                await container.vetify.webapp.loginPage.load();
            });
            await step('Presionar el botón "Iniciar Sesión"', async () => {
                await container.vetify.webapp.loginPage.submitButton.click();
            });
            await step('El sistema muestra un mensaje de error', async () => {
                expect.soft(page.url()).toBe(container.vetify.webapp.loginPage.getUrl());
                await expect
                    .soft(container.vetify.webapp.loginPage.errorMessageLbl)
                    .toContainText('La contraseña y/o correo electrónico no es válido. ¿No tienes usuario? Crear cuenta.');
            });
        });
    });

    // Nota: CP-01/CP-02 (validaciones del formulario en sí — campos vacíos, contenido del dropdown)
    // viven en un describe aparte, fuera del pool caro de usuarios Fresh/UNREGISTERED (cada uno implica
    // una compra real vía MercadoPago sandbox). Ninguno de los dos necesita una cuenta con plan
    // comprado detrás: cualquier registración exitosa aterriza en /validation/policy, y el plan solo
    // importa para el caso de "cobertura encontrada" (CP-04/CP-05, que sí siguen usando el pool).
    test.describe('TS-03 Activación de Cuenta - Validaciones de formulario', () => {
        test.beforeEach(async ({ container }) => {
            await step('El usuario se encuentra en la pantalla de activación de cuenta (registración descartable, sin plan asociado)', async () => {
                await container.vetify.webapp.registrationPage.load();
                await container.vetify.webapp.registrationPage.register({
                    email: getRandomEmail(),
                    password: getRandomPassword(),
                });
            });
        });

        test('TC-01 Campos obligatorios', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['El usuario se encuentra en la pantalla de activación de cuenta'],
                steps: ['El usuario se encuentra en la pantalla de activación de cuenta, sin completar ningún campo'],
                expectedResult: ['El botón "Verificar cobertura" permanece deshabilitado hasta completar los campos obligatorios'],
            });
            await step('1. El usuario se encuentra en la pantalla de activación de cuenta, sin completar ningún campo', async () => {
                await container.vetify.webapp.policyValidationPage.expectLoaded();
            });
            await step('El botón "Verificar cobertura" permanece deshabilitado hasta completar los campos obligatorios', async () => {
                // Confirmado en vivo (2026-08-07): el botón está deshabilitado por defecto (no es
                // clickeable), a diferencia del registro/login que sí permiten el submit y devuelven un
                // error del backend — acá el bloqueo es puramente de UI.
                await expect(container.vetify.webapp.policyValidationPage.submitButton).toBeDisabled();
            });
        });

        test('TC-02 Listado de tipos de documentos', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['El usuario se encuentra en la pantalla de activación de cuenta'],
                steps: ['El usuario se encuentra en la pantalla de activación de cuenta', 'Ver las opciones del selector de tipo de documento'],
                expectedResult: ['El selector muestra al menos una opción de tipo de documento válida (ej. DNI)'],
            });
            await step('1. El usuario se encuentra en la pantalla de activación de cuenta', async () => {
                await container.vetify.webapp.policyValidationPage.expectLoaded();
            });
            await step('El selector muestra al menos una opción de tipo de documento válida (ej. DNI)', async () => {
                const options = await container.vetify.webapp.policyValidationPage.documentTypeSelect.locator('option').allTextContents();
                expect(options.map((o) => o.trim())).toContain('DNI');
            });
        });
    });

    test.describe('TS-03 Activación de Cuenta', { tag: ['@NewVetifyB2C'] }, () => {
        let user: TestUser | undefined;
        // Prevent reserving more than one user for the execution
        test.describe.configure({ retries: 0, mode: 'serial' });

        test.beforeAll(async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            const registrationPage = new VetifyWebappRegistrationPage(page);
            user = await UserProvider.getUser({
                source: UserSource.Fresh,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.UNREGISTERED],
            });
            test.skip(!user, 'No se pudo obtener un usuario sin registrar');
            await step('Registrar usuario', async () => {
                await registrationPage.load();
                await registrationPage.register({
                    email: user!.email,
                    password: user!.password,
                });
            });
        });

        test.beforeEach(async ({ container, page }) => {
            await step('El usuario se encuentra en la pantalla de activación de cuenta', async () => {
                await container.vetify.webapp.loginPage.load();
                await Promise.all([
                    container.vetify.webapp.policyValidationPage.waitForPageLoaded(),
                    page.waitForResponse((response) => response.url().includes('/api/bff/audit/login')),
                    page.waitForResponse((response) => response.url().includes('/api/users/me')),
                    container.vetify.webapp.loginPage.login(user!.email, user!.password),
                ]);
            });
        });

        test('TC-03 Documento no existente', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema con al menos un plan adquirido'],
                steps: [
                    'El usuario se encuentra en la pantalla de activación de cuenta',
                    'Ingresar un nombre',
                    'Ingresar un apellido',
                    'Seleccionar un tipo de documento',
                    'Ingresar un número de documento que no esté asociado a ningún plan',
                    'Presionar el botón de "Verificar cobertura"',
                ],
                expectedResult: ['El sistema muestra un mensaje de error indicando que el usuario todavía no cuenta con cobertura'],
            });
            test.skip(!user, 'No se pudo obtener un usuario registrado');
            let response: Response;
            await step('1. El usuario se encuentra en la pantalla de activación de cuenta', async () => {
                await container.vetify.webapp.policyValidationPage.expectLoaded();
            });
            await step('2. Ingresar un nombre', async () => {
                await container.vetify.webapp.policyValidationPage.nameInput.fill('Test');
            });
            await step('3. Ingresar un apellido', async () => {
                await container.vetify.webapp.policyValidationPage.lastNameInput.fill('Test');
            });
            await step('4. Seleccionar un tipo de documento', async () => {
                await container.vetify.webapp.policyValidationPage.documentTypeSelect.selectOption('DNI');
            });
            await step('5. Ingresar un número de documento que no esté asociado a ningún plan', async () => {
                await container.vetify.webapp.policyValidationPage.documentNumberInput.fill(getRandomIdentificationNumber());
            });
            await step('6. Presionar el botón de "Verificar cobertura"', async () => {
                response = await container.vetify.webapp.policyValidationPage.validateCoverage();
            });
            await step('El sistema muestra un mensaje de error indicando que el usuario todavía no cuenta con cobertura', async () => {
                expect.soft(response.status()).toBe(200);
                const validationMessage = await container.vetify.webapp.policyValidationPage.getValidationMessage();
                expect.soft(validationMessage).toContain('Aún no tenés cobertura con vetify');
                expect.soft(page.url()).toBe(container.vetify.webapp.policyValidationPage.getUrl());
            });
        });

        test('TC-04 Documento ya registrado', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema con al menos un plan adquirido', 'Existe al menos un usuario con una cuenta ya activada'],
                steps: [
                    'El usuario se encuentra en la pantalla de activación de cuenta',
                    'Ingresar un nombre',
                    'Ingresar un apellido',
                    'Seleccionar un tipo de documento',
                    'Ingresar un número de documento de un usuario ya registrado con cuenta activada',
                    'Presionar el botón de "Verificar cobertura"',
                ],
                expectedResult: ['El sistema muestra un mensaje de error indicando que el usuario ya se encuentra registrado'],
            });
            const existingUser = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE],
                reserve: false,
                ignoreReserved: true,
            });
            test.skip(!user, 'No se pudo obtener un usuario registrado');
            test.skip(!existingUser, 'No se pudo obtener un usuario con cuenta activada');
            await step('1. El usuario se encuentra en la pantalla de activación de cuenta', async () => {
                await container.vetify.webapp.policyValidationPage.expectLoaded();
            });
            await step('2. Ingresar un nombre', async () => {
                await container.vetify.webapp.policyValidationPage.nameInput.fill('Test');
            });
            await step('3. Ingresar un apellido', async () => {
                await container.vetify.webapp.policyValidationPage.lastNameInput.fill('User');
            });
            await step('4. Seleccionar un tipo de documento', async () => {
                await container.vetify.webapp.policyValidationPage.documentTypeSelect.selectOption('DNI');
            });
            await step('5. Ingresar un número de documento de un usuario ya registrado con cuenta activada', async () => {
                await container.vetify.webapp.policyValidationPage.documentNumberInput.fill(existingUser!.identification.number);
            });
            await step('6. Presionar el botón de "Verificar cobertura"', async () => {
                await container.vetify.webapp.policyValidationPage.validateCoverage();
            });
            await step('El sistema muestra un mensaje de error indicando que el usuario ya se encuentra registrado', async () => {
                const validationMessage = await container.vetify.webapp.policyValidationPage.getValidationMessage();
                expect.soft(validationMessage).toContain('Ya existe usuario asociado al numero de identificación');
            });
        });

        test('TC-05 Activación de cuenta exitosa', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema con al menos un plan adquirido'],
                steps: [
                    'El usuario se encuentra en la pantalla de activación de cuenta',
                    'Ingresar un nombre',
                    'Ingresar un apellido',
                    'Seleccionar un tipo de documento',
                    'Ingresar un número de documento de un usuario ya registrado pero sin cuenta activa',
                    'Presionar el botón de "Verificar cobertura"',
                ],
                expectedResult: ['El sistema asocia correctamente la poliza al usuario creado', 'El sistema redirecciona a la home de Vetify'],
            });
            test.skip(!user, 'No se pudo obtener un usuario registrado');
            let response: Response;
            await step('1. El usuario se encuentra en la pantalla de activación de cuenta', async () => {
                await container.vetify.webapp.policyValidationPage.expectLoaded();
            });
            await step('2. Ingresar un nombre', async () => {
                await container.vetify.webapp.policyValidationPage.nameInput.fill('Test');
            });
            await step('3. Ingresar un apellido', async () => {
                await container.vetify.webapp.policyValidationPage.lastNameInput.fill('Automation');
            });
            await step('4. Seleccionar un tipo de documento', async () => {
                await container.vetify.webapp.policyValidationPage.documentTypeSelect.selectOption('DNI');
            });
            await step('5. Ingresar un número de documento de un usuario ya registrado pero sin cuenta activa', async () => {
                await container.vetify.webapp.policyValidationPage.documentNumberInput.fill(user!.identification.number);
            });
            await step('6. Presionar el botón de "Verificar cobertura"', async () => {
                response = await container.vetify.webapp.policyValidationPage.validateCoverage();
            });
            await step('El sistema asocia correctamente la poliza al usuario creado', async () => {
                expect.soft(response.status()).toBe(200);
                const validationMessage = await container.vetify.webapp.policyValidationPage.getValidationMessage();
                expect.soft(validationMessage).toContain('Ya tenés cobertura con vetify');
            });
            await step('El sistema redirecciona a la home de Vetify', async () => {
                await container.vetify.webapp.policyValidationPage.confirmValidation();
                await page.waitForURL(container.vetify.webapp.homePage.getUrl());
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-04 IMAS-3215 - Olvidé contraseña (CP01-CP05 del diseño de casos —
    // docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md)
    // =========================================================================
    test.describe('TS-04 IMAS-3215 - Olvidé contraseña', () => {
        test.beforeEach(async ({ container }) => {
            await container.vetify.webapp.loginPage.load();
            await container.vetify.webapp.loginPage.openForgotPassword();
        });

        test('CP01 Acceso al flujo de reseteo desde login', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario en /auth/login, sin sesión iniciada.'],
                steps: ['Presionar "¿Olvidaste tu contraseña?".'],
                expectedResult: ['No hay navegación a otra URL — se expande un sub-formulario inline con input "Correo electrónico" y botón "Enviar".'],
            });

            await step('No hay navegación a otra URL — se expande un sub-formulario inline con input "Correo electrónico" y botón "Enviar".', async () => {
                await expect(page).toHaveURL(/\/auth\/login/);
                await expect(container.vetify.webapp.loginPage.emailPassRecoveryInput).toBeVisible();
                await expect(container.vetify.webapp.loginPage.sendRecoveryButton).toBeVisible();
            });
        });

        test('CP02 Solicitud de reset con email registrado', { tag: ['@critical'] }, async ({ container }) => {
            const user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
                reserve: false,
                ignoreReserved: true,
            });
            test.skip(!user, 'No se pudo obtener un usuario registrado.');

            await setAllureDetails({
                preconditions: ['Usuario con el sub-formulario de reseteo expandido; existe un usuario registrado.'],
                steps: ['Ingresar el email del usuario y presionar "Enviar".'],
                expectedResult: [
                    'POST /api/passrecovery responde 200 con el mensaje genérico de instrucciones enviadas.',
                    'La UI muestra "Te hemos enviado un correo para que puedas resetear tu contraseña".',
                ],
            });

            let response: Response;
            await step('1. Ingresar el email del usuario y presionar "Enviar".', async () => {
                response = await container.vetify.webapp.loginPage.requestPasswordRecovery(user!.email);
            });
            await step('POST /api/passrecovery responde 200 con el mensaje genérico de instrucciones enviadas.', async () => {
                expect.soft(response.status()).toBe(200);
                expect.soft(await response.json()).toStrictEqual({ message: 'Si el email está registrado, recibirás instrucciones para recuperar tu contraseña.' });
            });
            await step('La UI muestra "Te hemos enviado un correo para que puedas resetear tu contraseña".', async () => {
                await expect(container.vetify.webapp.loginPage.recoverySuccessLbl).toBeVisible();
            });
        });

        test('CP03 [Negativo] Solicitud de reset con email no registrado', { tag: ['@critical'] }, async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Usuario con el sub-formulario de reseteo expandido.'],
                steps: ['Ingresar un email no asociado a ningún usuario y presionar "Enviar".'],
                expectedResult: [
                    'Respuesta y mensaje idénticos al caso de email registrado (CP02) — el sistema no revela si el email existe (previene user enumeration).',
                ],
            });

            let response: Response;
            await step('1. Ingresar un email no asociado a ningún usuario y presionar "Enviar".', async () => {
                response = await container.vetify.webapp.loginPage.requestPasswordRecovery('no-existe-este-usuario-qa-test@automation.com');
            });
            await step('Respuesta y mensaje idénticos al caso de email registrado (CP02) — el sistema no revela si el email existe.', async () => {
                expect.soft(response.status()).toBe(200);
                await expect(container.vetify.webapp.loginPage.recoverySuccessLbl).toBeVisible();
            });
        });

        test('CP04 [Bug conocido] [Negativo] Campo email obligatorio', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario con el sub-formulario de reseteo expandido, campo email vacío.'],
                steps: ['Presionar "Enviar" sin ingresar email.'],
                expectedResult: [
                    'El backend responde 400 "email es requerido". BUG: el frontend no muestra ese mensaje — en su lugar muestra un mensaje genérico de "problemas técnicos" engañoso para un simple campo vacío.',
                ],
            });

            let response: Response;
            await step('1. Presionar "Enviar" sin ingresar email.', async () => {
                [response] = await Promise.all([
                    page.waitForResponse((r) => r.url().includes('/api/passrecovery')),
                    container.vetify.webapp.loginPage.sendRecoveryButton.click(),
                ]);
            });
            await step('El backend responde 400 "email es requerido".', async () => {
                expect.soft(response.status()).toBe(400);
                expect.soft(await response.json()).toStrictEqual({ message: 'email es requerido' });
            });
            await step('BUG: el frontend muestra un mensaje genérico de "problemas técnicos" en vez de indicar el campo obligatorio.', async () => {
                await expect(container.vetify.webapp.loginPage.recoveryGenericErrorLbl).toBeVisible();
            });
        });

        test('CP05 [Bug conocido] [Negativo] Formato de email inválido no se valida', { tag: ['@critical'] }, async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Usuario con el sub-formulario de reseteo expandido.'],
                steps: ['Ingresar un valor sin formato de email válido (sin "@") y presionar "Enviar".'],
                expectedResult: [
                    'BUG: no hay validación de formato — el backend responde 200 con el mismo mensaje de éxito genérico, igual que un email válido.',
                ],
            });

            let response: Response;
            await step('1. Ingresar un valor sin formato de email válido y presionar "Enviar".', async () => {
                response = await container.vetify.webapp.loginPage.requestPasswordRecovery('noesunemail');
            });
            await step('BUG: no hay validación de formato — el backend responde 200 con el mismo mensaje de éxito genérico.', async () => {
                expect.soft(response.status()).toBe(200);
                await expect(container.vetify.webapp.loginPage.recoverySuccessLbl).toBeVisible();
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-05 IMAS-3215 - Cambio de contraseña (tras el link del correo)
    // =========================================================================
    // Requiere la ÚNICA cuenta cuya casilla real está monitoreada por EmailClient (IMP-006, ver
    // UserTag.REAL_EMAIL en src/providers/user/tags.ts) — el resto del pool usa emails sintéticos
    // que nunca reciben correo real. reserve:true (default, sin ignoreReserved) es intencional: a
    // diferencia del resto de esta suite, estos tests SÍ mutan la contraseña real de la cuenta —
    // no puede compartirse con otro test corriendo en paralelo mientras tanto. Diseño verificado en
    // vivo 2026-08-29 (ver docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md, CP10-18).
    test.describe('TS-05 IMAS-3215 - Cambio de contraseña', () => {
        // Los 4 tests compiten por la ÚNICA cuenta REAL_EMAIL — sin serial, `reserveUser()` no
        // reintenta (retorna undefined de inmediato si ya está reservada), y correrlos en paralelo
        // dejaría 3 de los 4 en skip por una carrera, no por falta real de cuenta.
        test.describe.configure({ mode: 'serial' });

        test('TC-01 - Vetify - Redirección al link del correo y campos de contraseña obligatorios', { tag: ['@critical'] }, async ({ container, page }) => {
            const user = await UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.REAL_EMAIL], reserve: true });
            test.skip(!user, 'No hay una cuenta con casilla de correo real disponible (UserTag.REAL_EMAIL).');

            await setAllureDetails({
                preconditions: ['Se solicitó un reseteo de contraseña y se recibió el correo real.'],
                steps: ['Navegar al link de reset recibido por correo.', 'Presionar "Restablecer contraseña" sin completar ningún campo.'],
                expectedResult: [
                    'El sistema redirige a la pantalla "Introduzca una nueva contraseña" (no a error ni a login).',
                    'Ambos campos se marcan obligatorios: "Introduzca una nueva contraseña." y "Debe introducir la contraseña una segunda vez".',
                ],
            });

            try {
                await step('1. Navegar al link de reset recibido por correo.', async () => {
                    const resetLink = await requestResetLink(container, user!.email);
                    await page.goto(resetLink);
                });
                await step('El sistema redirige a la pantalla "Introduzca una nueva contraseña".', async () => {
                    await expect(container.vetify.webapp.resetPasswordPage.headingLbl).toBeVisible();
                });
                await step('2. Presionar "Restablecer contraseña" sin completar ningún campo.', async () => {
                    await container.vetify.webapp.resetPasswordPage.submit();
                });
                await step('Ambos campos se marcan obligatorios.', async () => {
                    await expect(container.vetify.webapp.resetPasswordPage.newPasswordErrorLbl).toBeVisible();
                    await expect(container.vetify.webapp.resetPasswordPage.confirmPasswordErrorLbl).toBeVisible();
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-02 - [Negativo] Vetify - Rechazo de contraseña débil', { tag: ['@critical'] }, async ({ container, page }) => {
            const user = await UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.REAL_EMAIL], reserve: true });
            test.skip(!user, 'No hay una cuenta con casilla de correo real disponible (UserTag.REAL_EMAIL).');

            await setAllureDetails({
                preconditions: ['Se solicitó un reseteo de contraseña y se recibió el correo real.'],
                steps: ['Navegar al link de reset.', 'Ingresar una contraseña débil ("abc") en ambos campos y confirmar.'],
                expectedResult: [
                    'El envío queda bloqueado — no avanza a la pantalla de éxito.',
                    'El checklist en vivo de la política muestra únicamente "Letras minúsculas (a-z)" cumplido.',
                ],
            });

            try {
                await step('1. Navegar al link de reset.', async () => {
                    const resetLink = await requestResetLink(container, user!.email);
                    await page.goto(resetLink);
                });
                await step('2. Ingresar una contraseña débil ("abc") en ambos campos y confirmar.', async () => {
                    await container.vetify.webapp.resetPasswordPage.resetPassword('abc');
                });
                await step('El envío queda bloqueado y el checklist muestra un único criterio cumplido.', async () => {
                    await expect(container.vetify.webapp.resetPasswordPage.headingLbl).toBeVisible();
                    await expect(container.vetify.webapp.resetPasswordPage.policyCriterionChecked('minusculas')).toBeVisible();
                    await expect(container.vetify.webapp.resetPasswordPage.policyCriterionChecked('longitud')).toBeHidden();
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-03 - [Negativo] Vetify - Contraseñas no coinciden', { tag: ['@critical'] }, async ({ container, page }) => {
            const user = await UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.REAL_EMAIL], reserve: true });
            test.skip(!user, 'No hay una cuenta con casilla de correo real disponible (UserTag.REAL_EMAIL).');

            await setAllureDetails({
                preconditions: ['Se solicitó un reseteo de contraseña y se recibió el correo real.'],
                steps: ['Navegar al link de reset.', 'Ingresar contraseñas distintas en "Nueva contraseña" y "Reintroduzca contraseña".'],
                expectedResult: ['El sistema rechaza el envío y muestra "Las contraseñas no coinciden" en ambos campos.'],
            });

            try {
                await step('1. Navegar al link de reset.', async () => {
                    const resetLink = await requestResetLink(container, user!.email);
                    await page.goto(resetLink);
                });
                await step('2. Ingresar contraseñas distintas.', async () => {
                    await container.vetify.webapp.resetPasswordPage.fillPasswords('Hola123#', 'Hola123$');
                    await container.vetify.webapp.resetPasswordPage.submit();
                });
                await step('El sistema muestra "Las contraseñas no coinciden" en ambos campos.', async () => {
                    await expect(container.vetify.webapp.resetPasswordPage.mismatchErrorLbl.first()).toBeVisible();
                });
            } finally {
                UserProvider.releaseUser(user!);
            }
        });

        test('TC-04 - Vetify - Cambio exitoso, login con la nueva contraseña, la anterior invalidada y el link reusado rechazado (CP13/16/17/18/12)', { tag: ['@critical'] }, async ({ container, page }) => {
            const user = await UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.REAL_EMAIL], reserve: true });
            test.skip(!user, 'No hay una cuenta con casilla de correo real disponible (UserTag.REAL_EMAIL).');

            await setAllureDetails({
                preconditions: ['Se solicitó un reseteo de contraseña y se recibió el correo real.'],
                steps: [
                    'Navegar al link de reset y establecer una nueva contraseña cumpliendo la política.',
                    'Iniciar sesión con la nueva contraseña.',
                    'Intentar iniciar sesión con la contraseña anterior.',
                    'Reintentar el mismo link de reset ya usado.',
                ],
                expectedResult: [
                    'El sistema confirma el cambio ("¡Contraseña cambiada!") y permite loguearse con la nueva contraseña.',
                    'La contraseña anterior queda invalidada — el login con ella es rechazado.',
                    'El link ya usado queda rechazado ("Enlace caducado") si se reintenta.',
                ],
            });

            const oldPassword = user!.password;
            const newPassword = getRandomPassword();
            let usedResetLink = '';

            try {
                await step('1. Navegar al link de reset y establecer una nueva contraseña.', async () => {
                    usedResetLink = await requestResetLink(container, user!.email);
                    await page.goto(usedResetLink);
                    await container.vetify.webapp.resetPasswordPage.resetPassword(newPassword);
                });
                await step('El sistema confirma el cambio.', async () => {
                    await expect(container.vetify.webapp.resetPasswordPage.successHeadingLbl).toBeVisible();
                    await expect(container.vetify.webapp.resetPasswordPage.successMessageLbl).toBeVisible();
                });

                await step('2. Iniciar sesión con la nueva contraseña.', async () => {
                    await container.vetify.webapp.loginPage.load();
                    await container.vetify.webapp.loginPage.login(user!.email, newPassword);
                });
                await step('El login es exitoso.', async () => {
                    await expect(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                });

                // Limpia cookies en vez de buscar un botón de logout específico — lo único que le
                // importa a este paso es volver a un estado anónimo antes de reintentar el login.
                let oldPasswordLoginResponse: Response;
                await step('3. Intentar iniciar sesión con la contraseña anterior.', async () => {
                    await page.context().clearCookies();
                    await container.vetify.webapp.loginPage.load();
                    await container.vetify.webapp.loginPage.emailInput.fill(user!.email);
                    await container.vetify.webapp.loginPage.passwordInput.fill(oldPassword);
                    oldPasswordLoginResponse = await container.vetify.webapp.loginPage.clickLoginButton();
                });
                await step('El login con la contraseña anterior es rechazado.', async () => {
                    expect(oldPasswordLoginResponse!.status()).toBe(403);
                });

                await step('4. Reintentar el mismo link de reset ya usado.', async () => {
                    await page.goto(usedResetLink);
                });
                await step('El link ya usado queda rechazado ("Enlace caducado").', async () => {
                    await expect(container.vetify.webapp.resetPasswordPage.expiredHeadingLbl).toBeVisible();
                });
            } finally {
                // SIEMPRE restaurar la contraseña conocida del pool, incluso si algo de arriba falló —
                // esta cuenta es compartida (UserTag.REAL_EMAIL), otros tests asumen esta contraseña.
                try {
                    await restorePassword(container, page, user!.email, oldPassword);
                } catch (restoreError) {
                    console.error(`No se pudo restaurar la contraseña de ${user!.email} a la del pool. Verificar manualmente. Error:`, restoreError);
                } finally {
                    UserProvider.releaseUser(user!);
                }
            }
        });
    });
});
