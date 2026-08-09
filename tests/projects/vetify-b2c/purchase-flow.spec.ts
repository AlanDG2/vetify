import { getRandomEmail, getRandomIdentificationNumber } from '@helpers/automation-utils';
import { MERCADOPAGO_CARD_PROVIDER } from '@integrations/mercadopago/mercadoPagoCardProviders';
import { MercadoPagoCardsHelper } from '@integrations/mercadopago/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@integrations/mercadopago/mercadoPagoPaymentStatuses';
import { expect } from '@playwright/test';
import { test } from '@tests/framework/base-test';
import { setAllureDetails } from '@tests/framework/report-annotations-setup';

test.describe('Flujo de Compra', () => {
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
            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

            const dataset = {
                firstName: 'Test',
                lastName: 'Automation',
                email: getRandomEmail(),
                document: {
                    type: 'DNI',
                    number: getRandomIdentificationNumber(),
                },
            };

            await institutional.load();
            await institutional.plans.scrollIntoView();
            const selectedPlan = await institutional.plans.contractRandomPlan();

            await checkout.expectSelectedPlan(selectedPlan);

            await checkout.completePersonalData({
                firstName: dataset.firstName,
                lastName: dataset.lastName,
                email: dataset.email,
                phone: '1161898707',
                documentType: dataset.document.type,
                documentNumber: dataset.document.number,
            });

            await checkout.completeBillingData({
                province: 'Ciudad Autónoma de Buenos Aires',
                localitySearch: 'Ciudad',
                locality: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                address: 'Av Corrientes 123',
                zipCode: '123',
            });

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.APPROVED, MERCADOPAGO_CARD_PROVIDER.VISA);

            await checkout.completePaymentData({
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
            await expect(page).toHaveURL(/\/checkout\/success$/);

            // Validate the data in Salesforce
            // Hit the API to get the purchase data
        });

        test('TC-02 - Flujo de compra - Nuevo usuario adquirente - Compra fallida', async ({ container, page }) => {
            setAllureDetails({
                preconditions: [],
                steps: [
                    'Cargar la webinsitucional',
                    'Seleccionar un plan',
                    'Completar los datos solicitados',
                    'Presionar el botón "Continuar"',
                    'Completar la dirección de facturación',
                    'Presionar el botón "Continuar"',
                    'Ingresar los datos de la tarjeta de débito/crédito que no permita la compra (saldo insuficiente, datos incorrectos, etc)',
                    'Presionar el botón "Finalizar"',
                ],
                expectedResult: [
                    'El sistema redirecciona a una página de checkout fallido indicando que no ha sido posible realizar la compra. ',
                    'El usuario puede presionar el botón ""Reintentar Pago"" que redirecciona al paso 3 del flujo de adquisición',
                ],
            });
            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

            const dataset = {
                firstName: 'Test',
                lastName: 'Automation',
                email: getRandomEmail(),
                document: {
                    type: 'DNI',
                    number: getRandomIdentificationNumber(),
                },
            };

            await institutional.load();
            await institutional.plans.scrollIntoView();
            const selectedPlan = await institutional.plans.contractRandomPlan();

            await checkout.expectSelectedPlan(selectedPlan);

            await checkout.completePersonalData({
                firstName: dataset.firstName,
                lastName: dataset.lastName,
                email: dataset.email,
                phone: '1161898707',
                documentType: dataset.document.type,
                documentNumber: dataset.document.number,
            });

            await checkout.completeBillingData({
                province: 'Ciudad Autónoma de Buenos Aires',
                localitySearch: 'Ciudad',
                locality: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                address: 'Lavarden 157',
                zipCode: '1437',
            });

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.DECLINED_INSUFFICIENT_FUNDS, MERCADOPAGO_CARD_PROVIDER.VISA);

            await checkout.completePaymentData({
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
            await expect(page).toHaveURL(/\/checkout\/payment$/);
        });
    });

    test.describe('TS-05 Formulario - Paso 1', () => {
        test('TC-01 Listado de tipos de documentos', async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan y se encuentra en el paso 1 del checkout.'],
                steps: ['Cargar la web institucional', 'Seleccionar un plan', 'Ver las opciones del selector de tipo de documento'],
                expectedResult: ['El selector muestra al menos una opción de tipo de documento válida (ej. DNI)'],
            });
            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

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
            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            await checkout.continueButton.click();
            await expect(page).not.toHaveURL(/\/checkout\/billing$/);
        });
    });
});
