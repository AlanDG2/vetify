import type { Plan } from '@models/vetify/institutional';
import { BasePage } from '@pages/BasePage';
import { type Locator, type Page } from '@playwright/test';

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
    private readonly totalLabel: Locator;
    private readonly firstNameInput: Locator;
    private readonly lastNameInput: Locator;
    private readonly emailInput: Locator;
    private readonly phoneInput: Locator;
    readonly documentTypeSelect: Locator;
    private readonly documentNumberInput: Locator;
    readonly continueButton: Locator;
    private readonly provinceSelect: Locator;
    private readonly localityInput: Locator;
    private readonly addressInput: Locator;
    private readonly zipCodeInput: Locator;
    private readonly floorInput: Locator;
    private readonly apartmentInput: Locator;
    private readonly cardNumberInput: Locator;
    private readonly cardholderNameInput: Locator;
    private readonly cvvInput: Locator;
    private readonly expiryInput: Locator;
    private readonly finalizeButton: Locator;

    constructor(page: Page) {
        super(page);
        this.totalLabel = this.page.getByText('Total').last();
        this.firstNameInput = this.page.getByLabel('Nombre');
        this.lastNameInput = this.page.getByLabel('Apellido');
        this.emailInput = this.page.getByLabel('Email');
        this.phoneInput = this.page.getByLabel('Teléfono');
        this.documentTypeSelect = this.page.locator('select[name="documentType"]');
        this.documentNumberInput = this.page.locator('input[name="documentNumber"]');
        this.continueButton = this.page.getByRole('button', { name: /continuar/i });
        this.provinceSelect = this.page.getByLabel('Provincia');
        this.localityInput = this.page.getByLabel('Localidad');
        this.addressInput = this.page.getByLabel('Calle y número');
        this.zipCodeInput = this.page.getByLabel('Código postal');
        this.floorInput = this.page.getByLabel(/^Piso/);
        this.apartmentInput = this.page.getByLabel(/^Dpto/);
        this.cardNumberInput = this.page.getByLabel('Número de tarjeta');
        this.cardholderNameInput = this.page.getByLabel('Nombre');
        this.cvvInput = this.page.getByLabel('CVV');
        this.expiryInput = this.page.getByLabel('Vencimiento');
        this.finalizeButton = this.page.getByRole('button', { name: /finalizar/i });
    }

    async expectSelectedPlan(plan: Plan): Promise<void> {
        await this.page.getByText(plan.name, { exact: false }).last().waitFor({ state: 'visible' });
        await this.totalLabel.waitFor({ state: 'visible' });
    }

    // Returns the leadId from the API response, which can be used for further validation in Salesforce or other systems
    async completePersonalData(data: PersonalData): Promise<string> {
        await this.firstNameInput.fill(data.firstName);
        await this.lastNameInput.fill(data.lastName);
        await this.emailInput.fill(data.email);
        await this.phoneInput.fill(data.phone);
        await this.documentTypeSelect.selectOption({ label: data.documentType });
        await this.documentNumberInput.fill(data.documentNumber);

        const [response] = await Promise.all([this.page.waitForResponse('**/api/sf/first-step'), this.continueButton.click()]);

        const requestBody = response.request().postDataJSON();

        // TIPO_DOCUMENTO_SELECCIONADO NO se valida contra `data.documentType`: el <select> tiene
        // value="DNI" (confirmado con selectOption(), que devuelve el value real seleccionado), pero
        // el JS de la app lo traduce a un código interno de Salesforce (ej. "96" para DNI) antes de
        // mandarlo — no es un bug de la app, es un mapeo intencional que este test no necesita
        // reproducir. Confirmado en vivo 2026-08-13 que comparar contra "DNI" (label o value) rompía
        // siempre que este código se ejecutaba de verdad — el campo relevante para este test es
        // NUMERO_DOCUMENTO, no el código de tipo de documento.
        const isRequestValid =
            requestBody?.NOMBRE === data.firstName &&
            requestBody?.APELLIDO === data.lastName &&
            requestBody?.email === data.email &&
            typeof requestBody?.TIPO_DOCUMENTO_SELECCIONADO === 'string' &&
            requestBody.TIPO_DOCUMENTO_SELECCIONADO.length > 0 &&
            requestBody?.NUMERO_DOCUMENTO === data.documentNumber;

        if (!isRequestValid) {
            throw new Error('Personal data request payload does not match submitted values');
        }

        await this.page.waitForURL(/\/checkout\/billing$/);

        const responseBody = await response.json();

        if (typeof responseBody?.leadId !== 'string' || responseBody.leadId.length === 0) {
            throw new Error('Personal data response does not include a valid leadId');
        }

        return response.ok() ? responseBody.leadId : Promise.reject(new Error('Failed to submit personal data'));
    }

    async completeBillingData(data: BillingData): Promise<void> {
        await this.provinceSelect.selectOption({ label: data.province });
        await this.localityInput.fill(data.localitySearch);
        await this.page.getByText(data.locality, { exact: true }).click();
        await this.addressInput.fill(data.address);
        await this.zipCodeInput.fill(data.zipCode);

        if (data.floor) {
            await this.floorInput.fill(data.floor);
        }

        if (data.apartment) {
            await this.apartmentInput.fill(data.apartment);
        }

        await this.continueButton.click();

        await this.page.waitForURL(/\/checkout\/payment$/);
    }

    async completePaymentData(data: PaymentData): Promise<void> {
        await this.cardNumberInput.fill(data.cardNumber);
        await this.cardholderNameInput.fill(data.cardholderName);
        await this.cvvInput.fill(data.cvv);
        await this.expiryInput.fill(data.expiry);

        await this.finalizeButton.waitFor({ state: 'visible' });

        if (!(await this.finalizeButton.isEnabled())) {
            throw new Error('Finalize button is disabled after entering payment data');
        }
    }

    async completePurchase(): Promise<void> {
        const [response] = await Promise.all([this.page.waitForResponse('**/api/quantum/jengage/payment/pagar-mp**'), this.finalizeButton.click()]);

        if (!response.ok()) {
            throw new Error('Purchase request failed');
        }
    }
}
