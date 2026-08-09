import { environment, SiteId } from '@config/environment';
import { getRandomEmail, getRandomIdentificationNumber } from '@helpers/automation-utils';
import { expect } from '@playwright/test';
import { CuponProvider, CuponType } from '@providers/cupon';
import { setAllureDetails, test } from '@tests/framework/base-test';
import { step } from 'allure-js-commons';

test.describe('Flujo de Compra Test Suite', () => {
    test.describe('TS-01 Proceso de Compra', () => {
        test('TC-01 Canje de cupon exitoso', async ({ container, page }) => {
            const cupon = CuponProvider.getCupon({
                type: CuponType.OneTime,
                project: SiteId.FLUX_CAPITADO,
            });

            test.skip(!cupon, 'No hay cupones disponibles');

            const dataset = {
                firstName: 'Test',
                lastName: 'Automation',
                email: getRandomEmail(),
                document: {
                    type: 'DNI',
                    number: getRandomIdentificationNumber(),
                },
            };
            await step('1. Cargar la landing Page', async () => {
                await container.fluxCapitado.landingPage.load();
            });
            await step('2. Cargar todos los datos requeridos del formulario de compra', async () => {
                await container.fluxCapitado.landingPage.form.completeForm({
                    firstName: dataset.firstName,
                    lastName: dataset.lastName,
                    email: dataset.email,
                    codArea: '11',
                    phoneNumber: '12345678',
                    document: dataset.document,
                });
            });
            await step(`3. Ingresar un cupon que no se haya usado nunca ["${cupon!.code}"]`, async () => {
                await container.fluxCapitado.landingPage.form.cuponInput.fill(cupon!.code);
            });
            await step('4. Presionar el botón "ACTIVA SU PLAN"', async () => {
                const response = await container.fluxCapitado.landingPage.form.submitForm();
                const responseData = await response.json();
                expect.soft(response.status()).toBe(201);
                expect.soft(responseData).toHaveProperty('id');
                await expect.soft(page).toHaveURL(environment.FLUX_CAPITADO_INSTITUTIONAL_BASE_URL);
                await expect.soft(page.getByRole('heading', { name: '¡MUCHAS GRACIAS!' })).toBeVisible();
                await expect.soft(page.getByText('En breve vas a recibir un correo con los pasos para activar el plan')).toBeVisible();
            });
        });

        test('TC-02 Canje de cupon no válido', async ({ container, page }) => {
            setAllureDetails({
                preconditions: [],
                steps: ['Cargar la landing Page', 'Cargar todos los datos', 'Ingresar un copón no válido', 'Presionar el botón "ACTIVA SU PLAN"'],
                expectedResult: ['El sistema debe mostrar un mensaje de error indicando que el cupón ingresado no es válido.'],
            });
            const dataset = {
                firstName: 'Test',
                lastName: 'Automation',
                email: getRandomEmail(),
                document: {
                    type: 'DNI',
                    number: getRandomIdentificationNumber(),
                },
            };
            await step('1. Cargar la landing Page', async () => {
                await container.fluxCapitado.landingPage.load();
            });
            await step('2. Cargar todos los datos requeridos del formulario de compra', async () => {
                await container.fluxCapitado.landingPage.form.completeForm({
                    firstName: dataset.firstName,
                    lastName: dataset.lastName,
                    email: dataset.email,
                    codArea: '11',
                    phoneNumber: '12345678',
                    document: dataset.document,
                });
            });
            await step('3. Ingresar un cupón no válido', async () => {
                await container.fluxCapitado.landingPage.form.cuponInput.fill('TEST');
            });
            await step('4. Presionar el botón "ACTIVA SU PLAN"', async () => {
                const response = await container.fluxCapitado.landingPage.form.submitForm();
                expect.soft(container.fluxCapitado.landingPage.form.errorMessageLbl).toHaveText('Ese cupón no es válido.');
                expect.soft(page).toHaveURL(environment.FLUX_CAPITADO_INSTITUTIONAL_BASE_URL);
                expect.soft(await response.status()).toBe(422);
                expect.soft(await response.json()).toHaveProperty('error', 'El token no existe');
            });
        });

        test('TC-03 Canje de cupon ya usado', async ({ container, page }) => {
            const dataset = {
                firstName: 'Test',
                lastName: 'Automation',
                email: getRandomEmail(),
                document: {
                    type: 'DNI',
                    number: getRandomIdentificationNumber(),
                },
            };
            await step('1. Cargar la landing Page', async () => {
                await container.fluxCapitado.landingPage.load();
            });
            await step('2. Cargar todos los datos requeridos del formulario de compra', async () => {
                await container.fluxCapitado.landingPage.form.completeForm({
                    firstName: dataset.firstName,
                    lastName: dataset.lastName,
                    email: dataset.email,
                    codArea: '11',
                    phoneNumber: '12345678',
                    document: dataset.document,
                });
            });
            await step('3. Ingresar un cupon válido pero ya usado', async () => {
                await container.fluxCapitado.landingPage.form.cuponInput.fill('TESTFLUX415722');
            });
            await step('4. Presionar el botón "ACTIVA SU PLAN"', async () => {
                const response = await container.fluxCapitado.landingPage.form.submitForm();
                expect.soft(container.fluxCapitado.landingPage.form.errorMessageLbl).toHaveText('Ese cupón ya fue utilizado.');
                expect.soft(page).toHaveURL(environment.FLUX_CAPITADO_INSTITUTIONAL_BASE_URL);
                expect.soft(await response.status()).toBe(409);
                expect.soft(await response.json()).toHaveProperty('error', 'El Token ya existe (registro duplicado)');
            });
        });
    });

    test.describe('TS-02 Validación de formulario', () => {
        test('TC-04 Campos obligatorios', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: ['Cargar la landing Page', 'Presionar el botón "ACTIVA SU PLAN" sin completar ningún campo'],
                expectedResult: ['El sistema no envía el registro y no navega fuera de la landing'],
            });
            await step('1. Cargar la landing Page', async () => {
                await container.fluxCapitado.landingPage.load();
            });
            await step('2. Presionar el botón "ACTIVA SU PLAN" sin completar ningún campo', async () => {
                await container.fluxCapitado.landingPage.form.submitButton.click();
            });
            await step('El sistema no envía el registro y no navega fuera de la landing', async () => {
                expect(page.url()).toContain(environment.FLUX_CAPITADO_INSTITUTIONAL_BASE_URL);
            });
        });

        test('TC-05 Tipos de documentos', async ({ container }) => {
            await setAllureDetails({
                preconditions: [],
                steps: ['Cargar la landing Page', 'Ver las opciones del selector de tipo de documento'],
                expectedResult: ['El selector muestra al menos una opción de tipo de documento válida (ej. DNI)'],
            });
            await step('1. Cargar la landing Page', async () => {
                await container.fluxCapitado.landingPage.load();
            });
            await step('El selector muestra al menos una opción de tipo de documento válida (ej. DNI)', async () => {
                const options = await container.fluxCapitado.landingPage.form.documentTypeSelect.locator('option').allTextContents();
                expect(options.map((o) => o.trim())).toContain('DNI');
            });
        });
    });
});
