import { type Page, type Locator } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';
import { TestUser, UserProvider, UserRequest } from '@providers/user/user-provider';

export class VetifyWebappLoginPage extends VetifyWebappBasePage {
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
        await Promise.all([this.page.waitForResponse((response) => response.url().includes('/oauth/token') && response.status() === 200), this.submitButton.click()]);
    }

    async loginWithUserRequest(userRequest: UserRequest): Promise<TestUser | undefined> {
        const testUser = await UserProvider.getUser(userRequest);

        if (!testUser) {
            console.log(`No available test user with source: ${userRequest.source} and tags: ${userRequest.tags?.join(', ')}`);
            return undefined;
        }

        // IF the storage state exist for the user, we can use it to set the context storage state and avoid logging in again
        const existingStorageState = await UserProvider.getUserStorageState(testUser);

        if (existingStorageState) {
            console.log(`Using existing storage state for user: ${testUser.email}`);
            await this.page.context().addCookies(JSON.parse(existingStorageState).cookies);
            return testUser;
        }

        await this.load();
        await this.login(testUser.email, testUser.password);

        // After login, we can save the storage state for future use
        const storageState = await this.page.context().storageState();
        const storageStatePath = UserProvider.saveUserStorageState(testUser, JSON.stringify(storageState));
        console.log(`Saved storage state for user: ${testUser.email} at ${storageStatePath}`);

        return testUser;
    }
}
