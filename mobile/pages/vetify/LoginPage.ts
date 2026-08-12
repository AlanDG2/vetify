import { $ } from '@wdio/globals';
import { UserProvider } from '../../../src/providers/user/user-provider';
import type { TestUser, UserRequest } from '../../../src/providers/user/user-provider';
import { VetifyMobileAppBasePage } from './VetifyMobileAppBasePage';

// Locators calcados de src/pages/vetify/webapp/LoginPage.ts (Playwright) — el WebView de la
// app carga el mismo sitio (vetify-qa.ikeapp.com), mismo DOM/data-cy.
export class VetifyMobileLoginPage extends VetifyMobileAppBasePage {
    get emailInput() {
        return $('input[name="email"]');
    }

    get passwordInput() {
        return $('input[name="password"]');
    }

    get submitButton() {
        return $('button[data-cy="submitButton"]');
    }

    get errorMessageLbl() {
        return $('div[data-cy="messageBox"] p p');
    }

    async login(email: string, password: string): Promise<void> {
        await this.switchToWebViewContext();
        await this.emailInput.waitForDisplayed({ timeout: 30_000 });
        await this.emailInput.setValue(email);
        await this.passwordInput.setValue(password);
        await this.submitButton.click();
    }

    async loginWithUserRequest(userRequest: UserRequest): Promise<TestUser | undefined> {
        const testUser = await UserProvider.getUser(userRequest);

        if (!testUser) {
            console.log(`No available test user with source: ${userRequest.source}, siteId: ${userRequest.siteId} and tags: ${userRequest.tags?.join(', ')}`);
            return undefined;
        }

        await this.login(testUser.email, testUser.password);
        return testUser;
    }
}
