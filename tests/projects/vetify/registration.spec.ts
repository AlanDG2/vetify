import { setAllureDetails, test } from '../../framework/vetify-base-test';
import { expect } from '@playwright/test';
import { getRandomEmail, getRandomIdentificationNumber, getRandomPassword } from '@helpers/automation-utils';
import { VetifyInstitutionalPage } from '@pages/vetify/institutional/InstitutionalPage';
import { VetifyCheckoutPage } from '@pages/vetify/institutional/CheckoutPage';
import { MercadoPagoCardsHelper } from '@integrations/mercadopago/MercadoPagoCardsHelper';
import { MERCADOPAGO_CARD_PROVIDER } from '@integrations/mercadopago/mercadoPagoCardProviders';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@integrations/mercadopago/mercadoPagoPaymentStatuses';
import { UserProvider, UserSource, UserTag } from '@providers/user';

test.describe('Registración y Adquisición Test Suite', () => {
    test.describe('TS-01 Flujo de Compra', () => {
        test('CP-01 - Flujo de compra - Nuevo usuario adquiriente - Compra existosa - Plan individual', async ({ page }) => {
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
            const institutional = new VetifyInstitutionalPage(page);
            const checkout = new VetifyCheckoutPage(page);
            const uniqueEmail = `apro.qa+${Date.now()}@example.com`;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            const selectedPlan = await institutional.plans.contractRandomPlan();

            await checkout.expectSelectedPlan(selectedPlan);

            await checkout.completePersonalData({
                firstName: 'AUTOMATION',
                lastName: `QA ${Date.now()}`,
                email: uniqueEmail,
                phone: '1161898707',
                documentType: 'DNI',
                documentNumber: '10000001',
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

        test('CP-02 - Flujo de compra - Nuevo usuario adquiriente - Compra fallida', async ({ page }) => {
            const institutional = new VetifyInstitutionalPage(page);
            const checkout = new VetifyCheckoutPage(page);
            const uniqueEmail = `nosoporte.qa+${Date.now()}@example.com`;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            const selectedPlan = await institutional.plans.contractRandomPlan();

            await checkout.expectSelectedPlan(selectedPlan);

            await checkout.completePersonalData({
                firstName: 'AUTOMATION',
                lastName: `QA ${Date.now()}`,
                email: uniqueEmail,
                phone: '1161898707',
                documentType: 'DNI',
                documentNumber: '10000002',
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

    test.describe('TS-02 Registración', () => {
        test('CP-01 - Registración - DNI sin plan', async ({ registrationPage, policyValidationPage }) => {
            const dataSet = {
                firstName: 'Test',
                lastName: 'AUTOMATION',
                email: getRandomEmail(),
                password: getRandomPassword(),
                identification: {
                    number: getRandomIdentificationNumber(),
                    type: 'DNI',
                },
            };

            // Open the vetify webapp and register a new user
            await registrationPage.load();

            await registrationPage.register({
                email: dataSet.email,
                password: dataSet.password,
            });

            // Enter the DNI used in the purchase flow
            await policyValidationPage.validatePolicy({
                firstName: dataSet.firstName,
                lastName: dataSet.lastName,
                identification: {
                    number: dataSet.identification.number,
                    type: dataSet.identification.type,
                },
            });

            // Validate the success message is diplayed saying that there is a plan
            const validationMessage = await policyValidationPage.getValidationMessage();
            expect(validationMessage).toContain('Aún no tenés cobertura con vetify');
        });

        test('CP-02 - Registración - DNI con plan - Sin usuario', { tag: ['@NewVetify'] }, async ({ homePage, registrationPage, policyValidationPage, page }, testInfo) => {
            // Do not retry this test
            test.skip(testInfo.retry > 0);

            // If there are not available test user skip the test
            const testUser = await UserProvider.getUser({
                source: UserSource.Fresh,
                tags: [UserTag.UNREGISTERED],
            });
            test.skip(testUser === undefined, 'No available fresh test user with UNREGISTERED tags in the pool. Skipping the test.');

            // Open the vetify webapp and register a new user
            await registrationPage.load();

            await registrationPage.register({
                email: testUser!.email,
                password: testUser!.password,
            });

            // Enter the DNI used in the purchase flow
            await policyValidationPage.validatePolicy({
                firstName: 'Test',
                lastName: 'AUTOMATION',
                identification: testUser!.identification,
            });

            // Validate the success message is diplayed saying that there is a plan
            const validationMessage = await policyValidationPage.getValidationMessage();
            expect(validationMessage).toContain('Ya tenés cobertura con vetify');

            await policyValidationPage.confirmValidation();

            // Validate that is able to access
            // User is redirected to the WebApp home page
            await page.waitForURL(homePage.getUrl());

            // Open the profile
            // Validate the information in the profile

            // Validate the existance of the plan (waiting to add a mascot)
        });

        test('CP-03 - Registración - DNI con plan - Con usuario', async ({ registrationPage, policyValidationPage }) => {
            // ToDo: In a future replace this constant for a search in database of active plans
            const ALREADY_REGISTER_IDENTIFICATION_NUMBER = '36416999';

            const dataSet = {
                firstName: 'Test',
                lastName: 'AUTOMATION',
                email: getRandomEmail(),
                password: getRandomPassword(),
                identification: {
                    number: ALREADY_REGISTER_IDENTIFICATION_NUMBER,
                    type: 'DNI',
                },
            };

            // Open the vetify webapp and register a new user
            await registrationPage.load();

            await registrationPage.register({
                email: dataSet.email,
                password: dataSet.password,
            });

            // Enter the DNI used in the purchase flow
            await policyValidationPage.validatePolicy(
                {
                    firstName: dataSet.firstName,
                    lastName: dataSet.lastName,
                    identification: {
                        number: dataSet.identification.number,
                        type: dataSet.identification.type,
                    },
                },
                {
                    updateForSignupResponseStatus: 400,
                },
            );

            // Validate the success message is diplayed saying that there is a plan
            const validationMessage = await policyValidationPage.getValidationMessage();
            expect(validationMessage).toContain('Ya existe usuario asociado al numero de identificación');
        });

        test('CP-04 - Registración - Email ya registrado', async ({ registrationPage }) => {
            // ToDo: Reemplace it con a search looking for already existing users
            const ALREADY_REGISTER_EMAIL = 'jcaballero.ext@ikeasistencia.com.ar';

            const dataSet = {
                email: ALREADY_REGISTER_EMAIL,
                password: getRandomPassword(),
            };

            // Open the vetify webapp and register a new user
            await registrationPage.load();

            await registrationPage.register(
                {
                    email: dataSet.email,
                    password: dataSet.password,
                },
                {
                    registrationSuccessful: false,
                },
            );

            const validationMessage = await registrationPage.getValidationMessage();
            expect(validationMessage).toContain('Ya existe usuario asociado al mail ingresado');
        });
    });
});
