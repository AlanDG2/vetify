import { SiteId } from '@config/environment';
import { getRandomEmail, getRandomIdentificationNumber, getRandomPassword } from '@helpers/automation-utils';
import { VetifyWebappRegistrationPage } from '@pages/vetify/webapp';
import { expect, type Response } from '@playwright/test';
import { TestUser, UserProvider, UserSource, UserTag } from '@providers/user';
import { setAllureDetails, test } from '@tests/framework/base-test';
import { step } from 'allure-js-commons';

test.describe('Gestión de Usuario Test Suite', () => {
    test.describe('TS-01 Registración', () => {
        test('TC-01 Email ya existente', async ({ container }) => {
            const user = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.FLUX_CAPITADO,
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
                siteId: SiteId.FLUX_CAPITADO,
                tags: [UserTag.ACTIVE],
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

    test.describe('TS-03 Activación de Cuenta', { tag: ['@NewCapitadoOSDE'] }, () => {
        let user: TestUser | undefined;
        // Prevent reserving more than one user for the execution
        test.describe.configure({ retries: 0, mode: 'serial' });

        test.beforeAll(async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            const registrationPage = new VetifyWebappRegistrationPage(page);
            user = await UserProvider.getUser({
                source: UserSource.Fresh,
                siteId: SiteId.FLUX_CAPITADO,
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
                siteId: SiteId.FLUX_CAPITADO,
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
});
