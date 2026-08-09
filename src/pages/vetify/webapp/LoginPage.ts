import type { Locator, Page, Response } from '@playwright/test';
import { TestUser, UserProvider, UserRequest } from '@providers/user/user-provider';
import { VetifyWebappBasePage } from './BasePage';

export class VetifyWebappLoginPage extends VetifyWebappBasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessageLbl: Locator;

    // Sub-formulario de "Olvidé tu contraseña" (IMAS-3215) — confirmado en vivo 2026-08-07: NO navega a
    // otra URL, se expande inline en la misma pantalla /auth/login.
    readonly forgotPasswordLink: Locator;
    readonly emailPassRecoveryInput: Locator;
    readonly sendRecoveryButton: Locator;
    readonly recoverySuccessLbl: Locator;
    readonly recoveryGenericErrorLbl: Locator;

    constructor(page: Page) {
        super(page, '/auth/login');
        this.emailInput = this.page.locator('input[name="email"]');
        this.passwordInput = this.page.locator('input[name="password"]');
        this.submitButton = this.page.locator('button[data-cy="submitButton"]');
        this.errorMessageLbl = this.page.locator('div[data-cy="messageBox"] p p');

        this.forgotPasswordLink = this.page.getByText('¿Olvidaste tu contraseña?');
        this.emailPassRecoveryInput = this.page.locator('#emailPassRecovery');
        this.sendRecoveryButton = this.page.getByRole('button', { name: 'Enviar' });
        this.recoverySuccessLbl = this.page.getByText('Te hemos enviado un correo para que puedas resetear tu contraseña');
        // Copy real confirmado en vivo (2026-08-07): mensaje genérico de "problemas técnicos" — el
        // frontend lo muestra incluso para un simple error de validación (campo vacío), no solo caídas
        // reales de sistema. Ver CP04 en docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md.
        this.recoveryGenericErrorLbl = this.page.getByText('En este momento estamos con problemas técnicos');
    }

    async openForgotPassword(): Promise<void> {
        await this.forgotPasswordLink.click();
    }

    async requestPasswordRecovery(email: string): Promise<Response> {
        await this.emailPassRecoveryInput.fill(email);
        const [response] = await Promise.all([this.page.waitForResponse((r) => r.url().includes('/api/passrecovery')), this.sendRecoveryButton.click()]);
        return response;
    }

    async clickLoginButton(): Promise<Response> {
        const [response] = await Promise.all([this.page.waitForResponse((response) => response.url().includes('/oauth/token')), this.submitButton.click()]);
        return response;
    }

    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await Promise.all([this.page.waitForResponse((response) => response.url().includes('/oauth/token') && response.status() === 200), this.submitButton.click()]);
    }

    async loginWithUserRequest(userRequest: UserRequest): Promise<TestUser | undefined> {
        const testUser = await UserProvider.getUser(userRequest);

        if (!testUser) {
            console.log(`No available test user with source: ${userRequest.source}, siteId: ${userRequest.siteId} and tags: ${userRequest.tags?.join(', ')}`);
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
