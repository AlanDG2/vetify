import { Identification } from '@models/shared';
import { BaseSection } from '@pages/osde/institutional-osde-adquirente/components/BaseSection';
import type { Locator, Page, Response } from '@playwright/test';

export class AcquisitionFormComponent extends BaseSection {
    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly documentTypeSelect: Locator;
    readonly documentNumberInput: Locator;
    readonly codAreaInput: Locator;
    readonly phoneNumberInput: Locator;
    readonly emailInput: Locator;
    readonly cuponInput: Locator;
    readonly errorMessageLbl: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        super(page, page.locator('section#formulario-adquisicion'));

        this.firstNameInput = page.locator('input[name="firstName"]');
        this.lastNameInput = page.locator('input[name="lastName"]');
        this.documentTypeSelect = page.locator('select[name="docType"]');
        this.documentNumberInput = page.locator('input[name="docNum"]');
        this.codAreaInput = page.locator('input[name="codeArea"]');
        this.phoneNumberInput = page.locator('input[name="telephone"]');
        this.emailInput = page.locator('input[name="email"]');
        this.cuponInput = page.locator('input[name="cupon"]');
        this.errorMessageLbl = page.getByTestId('activate-plan-error-msg-lbl');
        this.submitButton = page.locator('button[data-testid="submit-btn"]');
    }

    async completeForm(data: {
        firstName: string;
        lastName: string;
        document: Identification;
        codArea: string;
        phoneNumber: string;
        email: string;
        cupon?: string;
    }): Promise<void> {
        await this.firstNameInput.fill(data.firstName);
        await this.lastNameInput.fill(data.lastName);
        await this.documentTypeSelect.selectOption({ label: data.document.type });
        await this.documentNumberInput.fill(data.document.number);
        await this.codAreaInput.fill(data.codArea);
        await this.phoneNumberInput.fill(data.phoneNumber);
        await this.emailInput.fill(data.email);
        if (data.cupon) {
            await this.cuponInput.fill(data.cupon);
        }
    }

    async submitForm(): Promise<Response> {
        const [response] = await Promise.all([this.page.waitForResponse((response) => response.url().includes('/api/registro')), this.submitButton.click()]);
        return response;
    }
}
