import { type Page, type Locator } from '@playwright/test';
import { VetifyWebAppBasePage } from './BasePage';

export class VetifyWebAppLoginPage extends VetifyWebAppBasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        super(page, '/auth/login');
        this.emailInput = this.page.locator('input[name="email"]');
        this.passwordInput = this.page.locator('input[name="password"]');
        this.submitButton = this.page.locator('button[data-cy="submitButton"]');
    }

    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await Promise.all([
            this.page.waitForResponse(response => response.url().includes('/oauth/token') && response.status() === 200),
            this.submitButton.click(),
        ]);
    }
}