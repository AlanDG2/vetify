import { expect, type Page } from '@playwright/test';
import type { Plan } from '@models/vetify/institutional';
import { BasePage } from '@pages/BasePage';

export type PersonalData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
};

export type BillingData = {
  province: string;
  localitySearch: string;
  locality: string;
  address: string;
  zipCode: string;
  floor?: string;
  apartment?: string;
};

export type PaymentData = {
  cardNumber: string;
  cardholderName: string;
  cvv: string;
  expiry: string;
};

export class VetifyCheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectSelectedPlan(plan: Plan): Promise<void> {
    await expect(this.page.getByText(plan.name, { exact: false }).last()).toBeVisible();
    await expect(this.page.getByText('Total').last()).toBeVisible();
  }

  // Returns the leadId from the API response, which can be used for further validation in Salesforce or other systems
  async completePersonalData(data: PersonalData): Promise<string> {
    await this.page.getByLabel('Nombre').fill(data.firstName);
    await this.page.getByLabel('Apellido').fill(data.lastName);
    await this.page.getByLabel('Email').fill(data.email);
    await this.page.getByLabel('Teléfono').fill(data.phone);
    await this.page.getByLabel('Tipo de documento').selectOption({ label: data.documentType });
    await this.page.getByLabel('Número de documento').fill(data.documentNumber);

    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/sf/first-step'),
      this.page.getByRole('button', { name: /continuar/i }).click()
    ]);

    const requestBody = response.request().postDataJSON();

    expect(requestBody).toMatchObject({
      NOMBRE: data.firstName,
      APELLIDO: data.lastName,
      email: data.email,
      TIPO_DOCUMENTO_SELECCIONADO: data.documentType,
      NUMERO_DOCUMENTO: data.documentNumber,
    });

    await expect(this.page).toHaveURL(/\/checkout\/billing$/);

    const responseBody = await response.json();

    // Validate that the response contains a leadId and that it's a non-empty string
    expect(responseBody).toHaveProperty('leadId');
    expect(typeof responseBody.leadId).toBe('string');
    expect(responseBody.leadId.length).toBeGreaterThan(0);

    return response.ok() ? responseBody.leadId : Promise.reject(new Error('Failed to submit personal data'));
  }

  async completeBillingData(data: BillingData): Promise<void> {
    await this.page.getByLabel('Provincia').selectOption({ label: data.province });
    await this.page.getByLabel('Localidad').fill(data.localitySearch);
    await this.page.getByText(data.locality, { exact: true }).click();
    await this.page.getByLabel('Calle y número').fill(data.address);
    await this.page.getByLabel('Código postal').fill(data.zipCode);

    if (data.floor) {
      await this.page.getByLabel(/^Piso/).fill(data.floor);
    }

    if (data.apartment) {
      await this.page.getByLabel(/^Dpto/).fill(data.apartment);
    }

    await this.page.getByRole('button', { name: /continuar/i }).click();

    await expect(this.page).toHaveURL(/\/checkout\/payment$/);
  }

  async completePaymentData(data: PaymentData): Promise<void> {
    await this.page.getByLabel('Número de tarjeta').fill(data.cardNumber);
    await this.page.getByLabel('Nombre').fill(data.cardholderName);
    await this.page.getByLabel('CVV').fill(data.cvv);
    await this.page.getByLabel('Vencimiento').fill(data.expiry);

    await expect(this.page.getByRole('button', { name: /finalizar/i })).toBeEnabled();
  }

  async completePurchase(): Promise<void> {
    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'),
      this.page.getByRole('button', { name: /finalizar/i }).click()
    ]);

    expect(response.ok()).toBeTruthy();
  }
}
