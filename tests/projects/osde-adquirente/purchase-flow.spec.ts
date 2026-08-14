import { getRandomEmail, getRandomIdentificationNumber } from '@helpers/automation-utils';
import { MERCADOPAGO_CARD_PROVIDER } from '@integrations/mercadopago/mercadoPagoCardProviders';
import { MercadoPagoCardsHelper } from '@integrations/mercadopago/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@integrations/mercadopago/mercadoPagoPaymentStatuses';
import { expect } from '@playwright/test';
import { setAllureDetails, test, type TestContainer } from '@tests/framework/base-test';

test.describe('Registración y Adquisición Test Suite', () => {
    test.describe('TS-01 Flujo de Compra', () => {
        test('TC-01 - Flujo de compra - Nuevo usuario adquirente - Compra existosa - Plan individual', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: [
                    'Cargar la web institucional',
                    'Seleccionar un plan',
                    'Completar los datos solicitados',
                    'Presionar el botón "Continuar"',
                    'Completar la dirección de facturación',
                    'Presionar el botón "Continuar"',
                    'Ingresar los datos de la tarjeta de débito/crédito',
                    'Presionar el botón "Finalizar"',
                ],
                expectedResult: [
                    'El pago es procesado correctamente ',
                    'El sistema redirecciona hacia la página de checkout exitoso mostrando confirmación de la compra mostrando los datos ingresados y el plan seleccionado',
                    'En Salesforce se registra un lead asociado como "Close Won"',
                    'En el sistema se registra una activación de una poliza para el DNI ingresado',
                ],
            });
            const uniqueEmail = getRandomEmail();
            const identificationNumber = getRandomIdentificationNumber();

            await Promise.all([container.osdeAdquiriente.landingPage.waitForPageLoaded(), container.osdeAdquiriente.landingPage.load()]);
            await container.osdeAdquiriente.landingPage.plans.scrollIntoView();
            const selectedPlan = await container.osdeAdquiriente.landingPage.plans.contractRandomPlan();

            await container.osdeAdquiriente.checkoutPage.expectSelectedPlan(selectedPlan);

            await container.osdeAdquiriente.checkoutPage.completePersonalData({
                firstName: 'AUTOMATION',
                lastName: `QA ${Date.now()}`,
                email: uniqueEmail,
                phone: '1161898707',
                documentType: 'DNI',
                documentNumber: identificationNumber,
            });

            await container.osdeAdquiriente.checkoutPage.completeBillingData({
                province: 'Ciudad Autónoma de Buenos Aires',
                localitySearch: 'Ciudad',
                locality: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                address: 'Av Corrientes 123',
                zipCode: '123',
            });

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.APPROVED, MERCADOPAGO_CARD_PROVIDER.VISA);

            await container.osdeAdquiriente.checkoutPage.completePaymentData({
                cardNumber: paymentData.cardNumber,
                cardholderName: paymentData.cardholderName,
                cvv: paymentData.cvv,
                expiry: paymentData.expiry,
            });

            const [response] = await Promise.all([page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'), page.getByRole('button', { name: /finalizar/i }).click()]);
            // TODO: Validate the request body contains the expected data structure and values
            // const requestBody = response.request().postDataJSON();
            // console.log('Purchase API request body:', requestBody);

            // Validate the purchase was completed successfully
            expect(response.ok()).toBeTruthy();

            const responseBody = await response.json();

            expect(responseBody).toMatchObject({
                status: 200,
                statusMP: {
                    status: 'approved',
                    statusDetail: 'accredited',
                },
            });

            expect(typeof responseBody.message).toBe('string');
            expect(responseBody.statusMP).toBeDefined();
            expect(typeof responseBody.statusMP.idUser).toBe('string');
            expect(typeof responseBody.statusMP.idMercadoPago).toBe('number');
            expect(Array.isArray(responseBody.statusMP.saleConfirmProducts)).toBe(true);
            expect(responseBody.statusMP.saleConfirmProducts).toHaveLength(1);

            const [product] = responseBody.statusMP.saleConfirmProducts;

            // TODO: Validate that the producto is correct based on the selected plan
            expect(product).toMatchObject({
                producto: expect.any(String),
                poliza: expect.any(String),
            });

            // Validate that the user lands in the Checkout Success page
            await expect(page).toHaveURL(/\/checkout\/success\?from=osde.*$/);

            // Validate the data in Salesforce
            // Hit the API to get the purchase data
        });

        test('TC-02 - Flujo de compra - Nuevo usuario adquirente - Compra fallida', async ({ container, page }) => {
            await Promise.all([container.osdeAdquiriente.landingPage.waitForPageLoaded(), container.osdeAdquiriente.landingPage.load()]);
            await container.osdeAdquiriente.landingPage.plans.scrollIntoView();
            const selectedPlan = await container.osdeAdquiriente.landingPage.plans.contractRandomPlan();
            const uniqueEmail = getRandomEmail();
            const identificationNumber = getRandomIdentificationNumber();

            await container.osdeAdquiriente.checkoutPage.expectSelectedPlan(selectedPlan);

            await container.osdeAdquiriente.checkoutPage.completePersonalData({
                firstName: 'AUTOMATION',
                lastName: `QA ${Date.now()}`,
                email: uniqueEmail,
                phone: '1161898707',
                documentType: 'DNI',
                documentNumber: identificationNumber,
            });

            await container.osdeAdquiriente.checkoutPage.completeBillingData({
                province: 'Ciudad Autónoma de Buenos Aires',
                localitySearch: 'Ciudad',
                locality: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                address: 'Lavarden 157',
                zipCode: '1437',
            });

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.DECLINED_INSUFFICIENT_FUNDS, MERCADOPAGO_CARD_PROVIDER.VISA);

            await container.osdeAdquiriente.checkoutPage.completePaymentData({
                cardNumber: paymentData.cardNumber,
                cardholderName: paymentData.cardholderName,
                cvv: paymentData.cvv,
                expiry: paymentData.expiry,
            });

            const [response] = await Promise.all([page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'), page.getByRole('button', { name: /finalizar/i }).click()]);

            // Validate the purchase was completed successfully
            expect(response.ok()).toBeTruthy();

            const responseBody = await response.json();

            expect(responseBody).toMatchObject({
                status: 400,
                statusMP: {
                    status: 'rejected',
                    statusDetail: 'cc_rejected_insufficient_amount',
                },
            });

            // Ensure user is not redirected to success page
            await expect(page).toHaveURL(/\/checkout\/payment\?from=osde.*$/);
        });
    });

    test.describe('TS-05 Formulario - Paso 1', () => {
        test('TC-01 Listado de tipos de documentos', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 1 del checkout.'],
                steps: ['Cargar la web institucional', 'Seleccionar un plan', 'Ver las opciones del selector de tipo de documento'],
                expectedResult: ['El selector muestra al menos una opción de tipo de documento válida (ej. DNI)'],
            });
            const institutional = container.osdeAdquiriente.landingPage;
            const checkout = container.osdeAdquiriente.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            const options = await checkout.documentTypeSelect.locator('option').allTextContents();
            expect(options.map((o) => o.trim())).toContain('DNI');
        });

        test('TC-02 Campos obligatorios', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 1 del checkout.'],
                steps: ['Cargar la web institucional', 'Seleccionar un plan', 'Presionar "Continuar" sin completar ningún campo'],
                expectedResult: ['El sistema no avanza al paso 2 (facturación)'],
            });
            const institutional = container.osdeAdquiriente.landingPage;
            const checkout = container.osdeAdquiriente.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            await checkout.continueButton.click();
            await expect(page).not.toHaveURL(/\/checkout\/billing$/);
        });
    });

    // Portado de documentation/Casos de Prueba (1).xlsx, hoja "Flujo de Compra", TS-06 Formulario -
    // Paso 2. Mismo checkout compartido que Vetify B2C (confirmado en vivo 2026-08-14, Playwright
    // MCP, misma URL /checkout/billing?from=osde) — mismo copy de error y misma lista de provincias.
    test.describe('TS-06 Formulario - Paso 2', () => {
        async function reachBillingStep(container: TestContainer): Promise<void> {
            const institutional = container.osdeAdquiriente.landingPage;
            const checkout = container.osdeAdquiriente.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            await checkout.completePersonalData({
                firstName: 'Test',
                lastName: `Automation ${Date.now()}`,
                email: getRandomEmail(),
                phone: '1161898707',
                documentType: 'DNI',
                documentNumber: getRandomIdentificationNumber(),
            });
        }

        test('TC-01 Listado de Provincias', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 2 del checkout.'],
                steps: ['Completar el paso 1', 'Desplegar el listado de provincias'],
                expectedResult: ['El sistema lista correctamente todas las provincias correspondientes a la República Argentina exclusivamente'],
            });

            await reachBillingStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            const provinces = await checkout.getProvinceOptionTexts();
            expect(provinces).toHaveLength(24);
            expect(provinces).toEqual(expect.arrayContaining(['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Córdoba']));
        });

        test('TC-02 Listado de Localidades', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 2 del checkout.'],
                steps: ['Completar el paso 1', 'Seleccionar una provincia', 'Buscar una localidad'],
                expectedResult: ['El sistema lista correctamente las localidades correspondientes a la provincia seleccionada'],
            });

            await reachBillingStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            await checkout.provinceSelect.selectOption({ label: 'Ciudad Autónoma de Buenos Aires' });
            const suggestions = await checkout.searchLocalitySuggestions('Ciudad');

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions).toContain('CIUDAD AUTONOMA DE BUENOS AIRES');
        });

        test('TC-03 Campos obligatorios', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 2 del checkout.'],
                steps: ['Completar el paso 1', 'Presionar "Continuar" sin completar ningún campo'],
                expectedResult: [
                    'El sistema muestra un mensaje de error indicando que Provincia, Localidad, Calle y número y Código postal son obligatorios',
                    'El sistema no avanza al paso 3 (formas de pago)',
                ],
            });

            await reachBillingStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            await checkout.continueButton.click();

            await expect(page).not.toHaveURL(/\/checkout\/payment/);
            await expect(checkout.requiredFieldErrors).toHaveCount(4);
        });

        test('TC-04 Volver al paso 1', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 2 del checkout.'],
                steps: ['Completar el paso 1', 'Presionar el botón "Regresar"'],
                expectedResult: ['El sistema redirecciona correctamente al primer paso del flujo de compra'],
            });

            await reachBillingStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            await checkout.backButton.click();

            await expect(page).toHaveURL(/\/checkout\/form/);
        });

        test('TC-05 Navegar al Paso 3', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 2 del checkout.'],
                steps: ['Completar el paso 1', 'Completar Provincia, Localidad, Calle y número y Código postal', 'Presionar el botón "Continuar"'],
                expectedResult: ['El sistema almacena temporalmente los datos ingresados', 'El sistema redirecciona correctamente al usuario al paso 3 del formulario de compra'],
            });

            await reachBillingStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            await checkout.completeBillingData({
                province: 'Ciudad Autónoma de Buenos Aires',
                localitySearch: 'Ciudad',
                locality: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                address: 'Av Corrientes 123',
                zipCode: '1414',
            });

            await expect(page).toHaveURL(/\/checkout\/payment/);
        });
    });

    // Portado de documentation/Casos de Prueba (1).xlsx, hoja "Flujo de Compra", TS-07 Formulario -
    // Paso 3.
    test.describe('TS-07 Formulario - Paso 3', () => {
        async function reachPaymentStep(container: TestContainer): Promise<void> {
            const institutional = container.osdeAdquiriente.landingPage;
            const checkout = container.osdeAdquiriente.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            await checkout.completePersonalData({
                firstName: 'Test',
                lastName: `Automation ${Date.now()}`,
                email: getRandomEmail(),
                phone: '1161898707',
                documentType: 'DNI',
                documentNumber: getRandomIdentificationNumber(),
            });

            await checkout.completeBillingData({
                province: 'Ciudad Autónoma de Buenos Aires',
                localitySearch: 'Ciudad',
                locality: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                address: 'Av Corrientes 123',
                zipCode: '1414',
            });
        }

        test('TC-01 Campos obligatorios', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 3 del checkout.'],
                steps: ['Completar los pasos 1 y 2', 'Presionar el botón "Finalizar" sin completar ningún campo'],
                expectedResult: ['El sistema muestra un mensaje de error indicando que Número de tarjeta, Nombre, CVV y Vencimiento son obligatorios'],
            });

            await reachPaymentStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            await checkout.finalizeButton.click();

            await expect(page).toHaveURL(/\/checkout\/payment/);
            await expect(checkout.requiredFieldErrors).toHaveCount(4);
        });

        test('TC-02 Volver al paso 2', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 3 del checkout.'],
                steps: ['Completar los pasos 1 y 2', 'Presionar el botón "Regresar"'],
                expectedResult: ['El sistema redirecciona correctamente al segundo paso del flujo de compra'],
            });

            await reachPaymentStep(container);
            const checkout = container.osdeAdquiriente.checkoutPage;

            await checkout.backButton.click();

            await expect(page).toHaveURL(/\/checkout\/billing/);
        });
    });
});
