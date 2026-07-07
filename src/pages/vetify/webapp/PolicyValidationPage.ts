import { type Page, type Locator } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';
import { Identification } from '@models/shared';

export interface PolicyValidationData {
    firstName: string;
    lastName: string;
    identification: Identification;
}

export class VetifyWebappPolicyValidationPage extends VetifyWebappBasePage {
    readonly nameInput: Locator;
    readonly lastNameInput: Locator;
    readonly documentNumberInput: Locator;
    readonly documentTypeSelect: Locator;
    readonly submitButton: Locator;
    readonly messageParagraph: Locator;

    constructor(page: Page) {
        super(page, '/validation/policy');
        this.nameInput = this.page.locator('input[name="name"]');
        this.lastNameInput = this.page.locator('input[name="lastname"]');
        this.documentNumberInput = this.page.locator('input[name="documentNumber"]');
        this.documentTypeSelect = this.page.locator('select[name="documentType"]');
        this.submitButton = this.page.locator('button[data-cy="submitButton"]');
        this.messageParagraph = this.page.locator('div[data-cy="messageBox"] > p');
    }

    async validatePolicy(
        data: PolicyValidationData,
        options?: {
            updateForSignupResponseStatus: number;
        },
    ): Promise<void> {
        const { updateForSignupResponseStatus = 200 } = options ?? {};

        await this.nameInput.fill(data.firstName);
        await this.lastNameInput.fill(data.lastName);
        await this.documentNumberInput.fill(data.identification.number);
        await this.documentTypeSelect.selectOption(data.identification.type);
        await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/users/update_for_signup') && response.status() === updateForSignupResponseStatus),
            this.submitButton.click(),
        ]);
    }

    async getValidationMessage(): Promise<string> {
        await this.messageParagraph.waitFor({ state: 'visible' });
        if (!(await this.messageParagraph.isVisible())) {
            throw new Error('Validation message is not visible');
        }
        const message = await this.messageParagraph.textContent();
        return message ? message.trim() : '';
    }

    async confirmValidation(): Promise<void> {
        await this.submitButton.click();
    }
}
