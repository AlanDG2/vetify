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

        // Portado de documentation/Casos de Prueba.xlsx, hoja "Flujo de Compra", TS-01 Compra de
        // Planes Exitosa. El test de arriba ("Plan individual") ya usa MercadoPagoCardsHelper con
        // el default `cardKind: 'credit'` — cubre la fila "Plan individual - Sin Cupón - Tarjeta
        // Crédito" aunque no estaba etiquetado así. Este test cubre la variante que faltaba:
        // mismo flujo, tarjeta de débito.
        test('TC-01b - Flujo de compra - Nuevo usuario adquirente - Compra exitosa - Plan individual - Tarjeta Débito', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [],
                steps: [
                    'Cargar la web institucional',
                    'Seleccionar un plan',
                    'Completar los datos solicitados',
                    'Presionar el botón "Continuar"',
                    'Completar la dirección de facturación',
                    'Presionar el botón "Continuar"',
                    'Ingresar los datos de una tarjeta de débito válida, vigente y con saldo a favor',
                    'Presionar el botón "Finalizar"',
                ],
                expectedResult: [
                    'El pago es procesado correctamente',
                    'El sistema redirecciona hacia la página de checkout exitoso mostrando confirmación de la compra',
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

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.APPROVED, MERCADOPAGO_CARD_PROVIDER.VISA, 'debit');

            await checkout.completePaymentData({
                cardNumber: paymentData.cardNumber,
                cardholderName: paymentData.cardholderName,
                cvv: paymentData.cvv,
                expiry: paymentData.expiry,
            });

            const [response] = await Promise.all([page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'), page.getByRole('button', { name: /finalizar/i }).click()]);

            expect(response.ok()).toBeTruthy();

            const responseBody = await response.json();

            expect(responseBody).toMatchObject({
                status: 200,
                statusMP: {
                    status: 'approved',
                    statusDetail: 'accredited',
                },
            });

            expect(Array.isArray(responseBody.statusMP.saleConfirmProducts)).toBe(true);
            expect(responseBody.statusMP.saleConfirmProducts).toHaveLength(1);

            // Validate that the user lands in the Checkout Success page
            await expect(page).toHaveURL(/\/checkout\/success$/);
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

    // Portado de documentation/Casos de Prueba.xlsx, hoja "Flujo de Compra", TS-02 Compra de
    // Planes Fallida, TC-01 "Tarjeta Prepaga". MercadoPago sandbox no tiene una tarjeta de prueba
    // marcada como prepaga — el cardholderName maneja el escenario simulado (ver
    // MercadoPagoCardsHelper), así que se usa REJECTED_CARD_TYPE_NOT_ALLOWED (CTNA), el código de
    // MP más cercano a "tipo de tarjeta no permitido". Confirmado en vivo 2026-08-14 que el backend
    // de este proyecto (Quantum) NO tiene un mapeo limpio para este código específico — a diferencia
    // de otros rechazos (ver TC-02 arriba, "cc_rejected_insufficient_amount" sí tiene status:
    // "rejected" prolijo), acá cae a un fallback genérico ("Error de código de respuesta de MP
    // inexistente en StatusErrorMp", status:"404" como string dentro de statusMP). El comportamiento
    // esencial de la CA sí se cumple (no se procesa el pago, no se completa la compra) — la
    // redacción específica "tarjetas prepagas no son aceptadas" no se pudo confirmar porque MP
    // sandbox no ofrece ese escenario exacto para simular. Mismo hallazgo en OSDE Adquirente.
    test.describe('TS-02 Compra de Planes Fallida', () => {
        test('TC-01 Compra fallida - Tarjeta Prepaga (simulada via CTNA)', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan en la landing de Vetify.'],
                steps: [
                    'Completar los datos obligatorios del paso 1',
                    'Navegar al paso 2',
                    'Completar los datos obligatorios del paso 2',
                    'Navegar al paso 3',
                    'Ingresar los datos de una tarjeta cuyo tipo no está permitido',
                    'Presionar el botón "Finalizar"',
                ],
                expectedResult: ['El sistema no procesa el pago', 'El usuario permanece en el paso 3 (no se completa la compra)'],
            });

            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            await checkout.completePersonalData({
                firstName: 'Test',
                lastName: 'Automation',
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

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.REJECTED_CARD_TYPE_NOT_ALLOWED, MERCADOPAGO_CARD_PROVIDER.VISA);

            await checkout.completePaymentData({
                cardNumber: paymentData.cardNumber,
                cardholderName: paymentData.cardholderName,
                cvv: paymentData.cvv,
                expiry: paymentData.expiry,
            });

            const [response] = await Promise.all([page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'), page.getByRole('button', { name: /finalizar/i }).click()]);

            expect(response.status()).toBe(400);

            const responseBody = await response.json();
            expect(responseBody.status).toBe(400);
            expect(typeof responseBody.statusMP?.statusDetail).toBe('string');
            expect(responseBody.statusMP.statusDetail).toContain('cc_rejected_card_type_not_allowed');

            // Ensure user is not redirected to success page
            await expect(page).toHaveURL(/\/checkout\/payment$/);
        });

        test('TC-02 Compra fallida - Problema tarjeta (simulada via OTHE)', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan en la landing de Vetify.'],
                steps: [
                    'Completar los datos obligatorios del paso 1',
                    'Navegar al paso 2',
                    'Completar los datos obligatorios del paso 2',
                    'Navegar al paso 3',
                    'Ingresar los datos de una tarjeta de débito o crédito que no sea válida (expirada/sin fondos/o rechace el banco)',
                    'Presionar el botón "Finalizar"',
                ],
                expectedResult: ['El sistema no procesa el pago', 'El sistema muestra un mensaje de error indicando que hubo un problema al procesar la compra'],
            });

            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            await checkout.completePersonalData({
                firstName: 'Test',
                lastName: 'Automation',
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

            const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.DECLINED_GENERAL, MERCADOPAGO_CARD_PROVIDER.VISA);

            await checkout.completePaymentData({
                cardNumber: paymentData.cardNumber,
                cardholderName: paymentData.cardholderName,
                cvv: paymentData.cvv,
                expiry: paymentData.expiry,
            });

            const [response] = await Promise.all([page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'), page.getByRole('button', { name: /finalizar/i }).click()]);

            // A diferencia de CTNA (regla de negocio de Vetify, HTTP 400 directo), un rechazo real de
            // MercadoPago (fondos/expiración/rechazo del banco) responde HTTP 200 — el pago se procesó
            // correctamente como intento, pero el resultado embebido en el body es un rechazo. Confirmado
            // en vivo 2026-08-29.
            expect(response.status()).toBe(200);

            const responseBody = await response.json();
            expect(responseBody.status).toBe(400);
            expect(responseBody.message).toBe('Tenemos un error al procesar tu compra, te contactaremos a la brevedad para solucionarlo.');
            expect(responseBody.statusMP.status).toBe('rejected');
            expect(responseBody.statusMP.statusDetail).toBe('cc_rejected_other_reason');

            // Ensure user is not redirected to success page
            await expect(page).toHaveURL(/\/checkout\/payment$/);
        });
    });

    // Portado de documentation/Casos de Prueba.xlsx, hoja "Flujo de Compra", TS-03 Asociación
    // de Compra con Usuario. El CA del Excel dice que comprar con el DNI de un usuario ya
    // registrado asocia el plan a esa cuenta — confirmado en vivo el 2026-08-14 (BUG-013, ver
    // docs/bugs/) que esto NO ocurre: ni de forma automática (verificado con reintento de 30s y de
    // nuevo ~10min después, descartando demora de propagación tipo IMP-004) ni existe una vía
    // manual de reclamo (una cuenta ya activa no puede volver a pasar por /validation/policy — la
    // desloguea). TC-01 y TC-03 documentan el comportamiento REAL (bug conocido, no el esperado
    // por el Excel) siguiendo el mismo patrón que user-management.spec.ts CP04/CP05 — quedan en
    // verde mientras el bug esté abierto, y deberían fallar (alertando) si algún día se corrige.
    // SKIP temporal (2026-08-18): las 2 cuentas REGISTERED nuevas del pool (3ac57f75, a7dc5b96,
    // ver src/fixtures/users/pooled-users.json) muestran conteo de planes inestable entre corridas
    // aisladas y en serie (sin problema de concurrencia — eso ya se arregló, ver comentario abajo).
    // Sospecha: demora de propagación de SU PROPIA compra de creación (mismo patrón que IMP-004),
    // afecta tanto a TC-01 (DNI) como a TC-02 (email), no es específico de ninguno de los dos.
    // Plan: revalidar mañana una vez que las cuentas terminen de asentarse; si sigue inestable,
    // investigar BUG-013 a fondo en vez de asumir que es solo asentamiento. Ver qa-workspace/decision-log.md 2026-08-18.
    test.describe('TS-03 Asociación de Compra con Usuario', () => {
        // Cada TC reserva su PROPIO usuario REGISTERED en exclusiva (reserve/ignoreReserved en sus
        // valores por defecto) — el pool tiene 3 cuentas REGISTERED para VETIFY_ADQUIRENTE
        // (ver src/fixtures/users/pooled-users.json) precisamente para que estos 3 TCs no compitan
        // por la misma cuenta. Antes se usaba reserve:false/ignoreReserved:true sobre una única
        // cuenta compartida: al correr en paralelo (fullyParallel del proyecto) se pisaban las
        // lecturas de plansBefore/plansAfter entre tests y el conteo quedaba inconsistente. Se
        // libera la reserva al final de cada test porque estos TCs piden el usuario directo por
        // UserProvider.getUser(), sin pasar por el fixture de login que la libera solo.
        // Serial además, como defensa adicional para que corridas diarias en pipeline no dependan
        // únicamente de tener exactamente 3 cuentas disponibles en el pool.
        test.describe.configure({ mode: 'serial' });

        test('TC-01 [Bug conocido, BUG-013] DNI ya está registrado - Email no registrado', async ({ container, page, browser }) => {
            const existingUser = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
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

            try {
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
            } finally {
                UserProvider.releaseUser(existingUser!);
            }
        });

        test('TC-02 DNI no registrado - Email registrado', async ({ container, page, browser }) => {
            const existingUser = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
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

            try {
                const plansBefore = await getLivePlanCount(browser, existingUser!);

                await purchasePlanFor(container, page, {
                    email: existingUser!.email,
                    documentType: existingUser!.identification.type,
                    documentNumber: getRandomIdentificationNumber(),
                });

                const plansAfter = await getLivePlanCount(browser, existingUser!);
                expect(plansAfter).toBe(plansBefore);
            } finally {
                UserProvider.releaseUser(existingUser!);
            }
        });

        test('TC-03 [Bug conocido, BUG-013] DNI y Email están relacionados a usuarios distintos', async ({ container, page, browser }) => {
            const dniOwner = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.REGISTERED],
            });
            const emailOwner = await UserProvider.getUser({
                source: UserSource.Pooled,
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE],
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

            try {
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
            } finally {
                UserProvider.releaseUser(dniOwner!);
                UserProvider.releaseUser(emailOwner!);
            }
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

            await checkout.documentTypeSelect.locator('option', { hasText: 'DNI' }).waitFor({ state: 'attached' });
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

    // Portado de documentation/Casos de Prueba.xlsx, hoja "Flujo de Compra", TS-06 Formulario -
    // Paso 2. Confirmado en vivo (2026-08-14, Playwright MCP) antes de automatizar: el mensaje de
    // campo obligatorio es "Este campo es obligatorio" (aparece 1 vez por campo, inline), Provincia
    // es un <select> con las 23 provincias argentinas + CABA (24 opciones reales), y Localidad pasa
    // de deshabilitado a un buscador con autocompletado recién después de elegir una provincia.
    test.describe('TS-06 Formulario - Paso 2', () => {
        async function reachBillingStep(container: TestContainer): Promise<void> {
            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

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

    // Portado de documentation/Casos de Prueba.xlsx, hoja "Flujo de Compra", TS-07 Formulario -
    // Paso 3. Mismo copy de error confirmado en vivo ("Este campo es obligatorio", 4 apariciones al
    // presionar "Finalizar" sin completar nada).
    test.describe('TS-07 Formulario - Paso 3', () => {
        async function reachPaymentStep(container: TestContainer): Promise<void> {
            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

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
            const checkout = container.b2c.checkoutPage;

            await checkout.backButton.click();

            await expect(page).toHaveURL(/\/checkout\/billing/);
        });
    });

    // Portado de documentation/Casos de Prueba.xlsx, hoja "Flujo de Compra", TS-04 Cupones.
    // Solo TC-01 (cupón inexistente) se automatiza hoy — TC-02 a TC-07 necesitan un código de cupón
    // real y válido para probar, y los 2 códigos del fixture del proyecto (src/fixtures/cupons/
    // reusable-cupons.json, "UNIVERSAL-REUSE-10"/"OSDE-REUSE-20") se confirmaron FALSOS en vivo
    // 2026-08-14 — ambos dan error real de "cupón inválido" contra el checkout real. Investigado:
    // esos códigos solo aparecen en tests/unit-tests/cupon-provider.unit.spec.ts, que los escribe
    // temporalmente para probar la lógica de CuponPool y los revierte después — nunca fueron
    // sembrados como cupones reales en el backend. Sin un código real, TC-02-07 quedan bloqueados
    // (ver qa-workspace/decision-log.md 2026-08-14 para el detalle completo).
    test.describe('TS-04 Cupones', () => {
        test('TC-01 Aplicar cupón no existente', async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Usuario seleccionó un plan en la landing de Vetify.'],
                steps: ['Ingresar un cupón no válido'],
                expectedResult: ['El sistema muestra un mensaje de error indicando que el cupón ingresado no es válido', 'El valor de compra no es modificado', 'El usuario puede agregar otro cupón si lo desea'],
            });

            const institutional = container.b2c.landingPage;
            const checkout = container.b2c.checkoutPage;

            await institutional.load();
            await institutional.plans.scrollIntoView();
            await institutional.plans.contractRandomPlan();

            const totalBefore = await checkout.getOrderTotalText();

            await checkout.applyCoupon('CUPON-INEXISTENTE-XYZ');

            await expect(page.getByText('Cupón no encontrado')).toBeVisible();
            expect(await checkout.getOrderTotalText()).toBe(totalBefore);

            // El usuario puede agregar otro cupón si lo desea: el input sigue habilitado.
            await checkout.applyCoupon('OTRO-CUPON-INEXISTENTE');
            await expect(page.getByText('Cupón no encontrado')).toBeVisible();
        });
    });
});
