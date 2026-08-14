import { SiteId } from '@config/environment';
import { getRandomEmail, getRandomIdentificationNumber } from '@helpers/automation-utils';
import { MERCADOPAGO_CARD_PROVIDER } from '@integrations/mercadopago/mercadoPagoCardProviders';
import { MercadoPagoCardsHelper } from '@integrations/mercadopago/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@integrations/mercadopago/mercadoPagoPaymentStatuses';
import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';
import { VetifyWebappLoginPage } from '@pages/vetify/webapp/LoginPage';
import { expect, type Browser, type Page } from '@playwright/test';
import { UserProvider, UserSource, UserTag, type TestUser } from '@providers/user';
import { step, test, type TestContainer } from '@tests/framework/base-test';
import { setAllureDetails } from '@tests/framework/report-annotations-setup';

// Sesión descartable: loguea como `user`, lee la cantidad real de planes vía API y cierra el
// contexto. No confía en `TestUser.numberOfPlans` del fixture (confirmado en vivo 2026-08-13 que
// puede estar desactualizado respecto al estado real del backend — mismo patrón ya visto varias
// veces en el pool de mobile) — siempre lee el estado real antes y después de la compra.
async function getLivePlanCount(browser: Browser, user: TestUser): Promise<number> {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        const loginPage = new VetifyWebappLoginPage(page);
        await loginPage.load();
        await loginPage.login(user.email, user.password);
        await page.waitForURL((url) => !url.pathname.includes('/auth/login'));
        const apiClient = await VetifyWebappApiClient.getApiClient(page);
        return (await apiClient.getUserPets()).length;
    } finally {
        await context.close();
    }
}

async function purchasePlanFor(container: TestContainer, page: Page, data: { email: string; documentType: string; documentNumber: string }) {
    const institutional = container.b2c.landingPage;
    const checkout = container.b2c.checkoutPage;

    await institutional.load();
    await institutional.plans.scrollIntoView();
    const selectedPlan = await institutional.plans.contractRandomPlan();

    await checkout.expectSelectedPlan(selectedPlan);

    await checkout.completePersonalData({
        firstName: 'Test',
        lastName: `Automation ${Date.now()}`,
        email: data.email,
        phone: '1161898707',
        documentType: data.documentType,
        documentNumber: data.documentNumber,
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

    if (!response.ok()) {
        throw new Error(`Purchase request failed: ${response.status()}`);
    }
    const responseBody = await response.json();
    if (responseBody?.statusMP?.status !== 'approved') {
        throw new Error(`Purchase was not approved: ${JSON.stringify(responseBody)}`);
    }
}

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

    // Portado de documentation/Casos de Prueba (1).xlsx, hoja "Flujo de Compra", TS-03 Asociación
    // de Compra con Usuario. El CA del Excel dice que comprar con el DNI de un usuario ya
    // registrado asocia el plan a esa cuenta — confirmado en vivo el 2026-08-14 (BUG-013, ver
    // docs/bugs/) que esto NO ocurre: ni de forma automática (verificado con reintento de 30s y de
    // nuevo ~10min después, descartando demora de propagación tipo IMP-004) ni existe una vía
    // manual de reclamo (una cuenta ya activa no puede volver a pasar por /validation/policy — la
    // desloguea). TC-01 y TC-03 documentan el comportamiento REAL (bug conocido, no el esperado
    // por el Excel) siguiendo el mismo patrón que user-management.spec.ts CP04/CP05 — quedan en
    // verde mientras el bug esté abierto, y deberían fallar (alertando) si algún día se corrige.
    test.describe('TS-03 Asociación de Compra con Usuario', () => {
        test('TC-01 [Bug conocido, BUG-013] DNI ya está registrado - Email no registrado', async ({ container, page, browser }) => {
            const existingUser = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
                reserve: false,
                ignoreReserved: true,
            });
            test.skip(!existingUser, 'No se pudo obtener un usuario registrado.');

            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema.'],
                steps: [
                    'Completar el flujo de compra con el DNI de un usuario ya registrado y un email que no esté asociado a ningún usuario.',
                    'Iniciar sesión con el usuario cuyo DNI se usó en la compra.',
                ],
                expectedResult: [
                    'Según el Excel: el sistema debería asociar el plan al usuario cuya identificación corresponde al DNI ingresado.',
                    'BUG-013 (docs/bugs/): en la realidad no se asocia — la cantidad de planes del usuario existente no cambia.',
                ],
            });

            const plansBefore = await getLivePlanCount(browser, existingUser!);

            await purchasePlanFor(container, page, {
                email: getRandomEmail(),
                documentType: existingUser!.identification.type,
                documentNumber: existingUser!.identification.number,
            });

            await step('BUG-013: la compra NO queda asociada al usuario del DNI — su cantidad de planes no cambia.', async () => {
                const plansAfter = await getLivePlanCount(browser, existingUser!);
                expect(plansAfter).toBe(plansBefore);
            });
        });

        test('TC-02 DNI no registrado - Email registrado', async ({ container, page, browser }) => {
            const existingUser = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
                reserve: false,
                ignoreReserved: true,
            });
            test.skip(!existingUser, 'No se pudo obtener un usuario registrado.');

            await setAllureDetails({
                preconditions: ['Existe al menos un usuario registrado en el sistema.'],
                steps: [
                    'Completar el flujo de compra con un DNI que no esté registrado y el email de un usuario ya registrado.',
                    'Iniciar sesión con el usuario cuyo email se usó en la compra.',
                ],
                expectedResult: ['La compra NO queda asociada al usuario del email ingresado — su cantidad de planes no cambia.'],
            });

            const plansBefore = await getLivePlanCount(browser, existingUser!);

            await purchasePlanFor(container, page, {
                email: existingUser!.email,
                documentType: existingUser!.identification.type,
                documentNumber: getRandomIdentificationNumber(),
            });

            const plansAfter = await getLivePlanCount(browser, existingUser!);
            expect(plansAfter).toBe(plansBefore);
        });

        test('TC-03 [Bug conocido, BUG-013] DNI y Email están relacionados a usuarios distintos', async ({ container, page, browser }) => {
            const dniOwner = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
                reserve: false,
                ignoreReserved: true,
            });
            const emailOwner = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE],
                reserve: false,
                ignoreReserved: true,
            });
            test.skip(!dniOwner || !emailOwner || dniOwner.email === emailOwner.email, 'No se pudieron obtener 2 usuarios registrados distintos.');

            await setAllureDetails({
                preconditions: ['Existen al menos 2 usuarios registrados distintos en el sistema.'],
                steps: [
                    'Completar el flujo de compra con el DNI de un usuario y el email de OTRO usuario ya registrado.',
                    'Verificar la cantidad de planes de ambos usuarios.',
                ],
                expectedResult: [
                    'Según el Excel: el sistema debería asociar el plan al usuario cuya identificación (DNI) corresponde, no al dueño del email.',
                    'BUG-013 (docs/bugs/): en la realidad no se asocia a ninguno de los dos — ni al dueño del DNI (esperado) ni al dueño del email (correctamente descartado).',
                ],
            });

            const dniOwnerPlansBefore = await getLivePlanCount(browser, dniOwner!);
            const emailOwnerPlansBefore = await getLivePlanCount(browser, emailOwner!);

            await purchasePlanFor(container, page, {
                email: emailOwner!.email,
                documentType: dniOwner!.identification.type,
                documentNumber: dniOwner!.identification.number,
            });

            await step('BUG-013: el plan NO queda asociado al usuario del DNI (comportamiento esperado por el Excel, hoy no ocurre).', async () => {
                const dniOwnerPlansAfter = await getLivePlanCount(browser, dniOwner!);
                expect(dniOwnerPlansAfter).toBe(dniOwnerPlansBefore);
            });

            await step('El usuario del email tampoco ve ningún plan nuevo (correcto).', async () => {
                const emailOwnerPlansAfter = await getLivePlanCount(browser, emailOwner!);
                expect(emailOwnerPlansAfter).toBe(emailOwnerPlansBefore);
            });
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
