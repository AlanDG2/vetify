import type { Locator, Page, Response } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';

export class VetifyWebappRegistrationPage extends VetifyWebappBasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly messageParagraph: Locator;

    constructor(page: Page) {
        super(page, '/auth/sign-up');
        this.emailInput = this.page.locator('input[name="email"]');
        this.passwordInput = this.page.locator('input[name="password"]');
        this.submitButton = this.page.locator('button[data-cy="submitButton"]');
        this.messageParagraph = this.page.locator('div[data-cy="messageBox"] > p');
    }

    async register(
        data: {
            email: string;
            password: string;
        },
        options?: {
            registrationSuccessful: boolean;
        },
    ): Promise<void> {
        const { email, password } = data;

        const { registrationSuccessful = true } = options || {};

        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);

        const expectedActions = [
            this.page.waitForResponse((response) => response.url().includes('/api/users/create') && response.status() === (registrationSuccessful ? 200 : 400)),
            this.submitButton.click(),
        ];

        // If the registration is not successful, the user is not redirected
        if (registrationSuccessful) {
            expectedActions.concat([
                // Validate that the user is redirected to the Policy Validation page after registration
                this.page.waitForURL(`${this.baseUrl}/validation/policy`),
                // Wait for the Policy Validation page to load after registration
                this.page.waitForResponse((response) => response.url().includes('/validation/policy.json') && response.status() === 200),
                this.page.waitForResponse((response) => response.url().includes('/api/brand/vetify-qa.ikeapp.com/identification-types') && response.status() === 200),
            ]);
        }

        await Promise.all(expectedActions);
    }

    async clickRegistrationButton(): Promise<Response> {
        const [response] = await Promise.all([this.page.waitForResponse((response) => response.url().includes('/api/users/create')), this.submitButton.click()]);
        return response;
    }

    async getValidationMessage(): Promise<string> {
        await this.messageParagraph.waitFor({ state: 'visible' });
        if (!(await this.messageParagraph.isVisible())) {
            throw new Error('Validation message is not visible');
        }
        const message = await this.messageParagraph.textContent();
        return message ? message.trim() : '';
    }
}
