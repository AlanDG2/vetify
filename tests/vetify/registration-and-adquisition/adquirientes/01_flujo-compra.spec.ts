import { expect, test } from '@playwright/test';
import { VetifyInstitutionalPage } from '@pages/vetify/institutional/InstitutionalPage';
import { VetifyCheckoutPage } from '@pages/vetify/institutional/CheckoutPage';
import { MercadoPagoCardsHelper } from '@helpers/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@constants/mercadoPagoPaymentStatuses';
import { MERCADOPAGO_CARD_PROVIDER } from '@constants/mercadoPagoCardProviders';

test.describe('TS01: Flujo de Compra', () => {

  test('[CP-01.01] Vetify - Flujo de compra - Nuevo usuario adquiriente - Compra existosa - Plan individual', async ({ page }) => {
    const institutional = new VetifyInstitutionalPage(page);
    const checkout = new VetifyCheckoutPage(page);
    const uniqueEmail = `apro.qa+${Date.now()}@example.com`;

    await institutional.load();
    const selectedPlan = await institutional.plans.contractRandomPlan();

    console.log('Selected plan:', selectedPlan);

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

    const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(
      MERCADOPAGO_PAYMENT_STATUSES.APPROVED,
      MERCADOPAGO_CARD_PROVIDER.VISA,
    );

    await checkout.completePaymentData({
      cardNumber: paymentData.cardNumber,
      cardholderName: paymentData.cardholderName,
      cvv: paymentData.cvv,
      expiry: paymentData.expiry,
    });

    const [response] = await Promise.all([
      page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'),
      page.getByRole('button', { name: /finalizar/i }).click()
    ]);
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

  test('[CP-01.03] Vetify - Flujo de compra - Nuevo usuario adquiriente - Compra fallida', async ({ page }) => {
    const institutional = new VetifyInstitutionalPage(page);
    const checkout = new VetifyCheckoutPage(page);
    const uniqueEmail = `nosoporte.qa+${Date.now()}@example.com`;

    await institutional.load();
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

    const paymentData = MercadoPagoCardsHelper.buildCheckoutPaymentData(
      MERCADOPAGO_PAYMENT_STATUSES.DECLINED_INSUFFICIENT_FUNDS,
      MERCADOPAGO_CARD_PROVIDER.VISA,
    );

    await checkout.completePaymentData({
      cardNumber: paymentData.cardNumber,
      cardholderName: paymentData.cardholderName,
      cvv: paymentData.cvv,
      expiry: paymentData.expiry,
    });

    const [response] = await Promise.all([
      page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'),
      page.getByRole('button', { name: /finalizar/i }).click()
    ]);

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
