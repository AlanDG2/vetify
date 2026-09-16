import type { Locator, Page, Response } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';

// Distingue el caso "el email ya tiene cuenta creada" (mensaje real de la UI: "Ya existe usuario
// asociado al mail ingresado") de cualquier otro fallo de registro -- confirmado en vivo 2026-09-04
// que /api/users/create responde 400 en este caso, no 200, así que sin esto register() colgaba 30s
// esperando un 200 que nunca llega (ver docs/impedimentos-bloqueos.md).
export class AccountAlreadyExistsError extends Error {
    constructor(email: string) {
        super(`Ya existe una cuenta registrada para ${email}`);
        this.name = 'AccountAlreadyExistsError';
    }
}

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

        // Capturar el status real de /api/users/create (no solo esperar el status esperado) para poder
        // distinguir "ya existe cuenta" de cualquier otro fallo, en vez de colgar 30s esperando un status
        // que nunca va a llegar.
        const [createResponse] = await Promise.all([this.page.waitForResponse((response) => response.url().includes('/api/users/create')), this.submitButton.click()]);

        if (registrationSuccessful && createResponse.status() === 400) {
            throw new AccountAlreadyExistsError(email);
        }

        const expectedStatus = registrationSuccessful ? 200 : 400;
        if (createResponse.status() !== expectedStatus) {
            throw new Error(`/api/users/create respondió ${createResponse.status()} para ${email} (se esperaba ${expectedStatus})`);
        }

        // If the registration is not successful, the user is not redirected
        if (registrationSuccessful) {
            await Promise.all([
                // Validate that the user is redirected to the Policy Validation page after registration
                this.page.waitForURL(`${this.baseUrl}/validation/policy`),
                // Wait for the Policy Validation page to load after registration
                this.page.waitForResponse((response) => response.url().includes('/validation/policy.json') && response.status() === 200),
                this.page.waitForResponse((response) => response.url().includes('/api/brand/vetify-qa.ikeapp.com/identification-types') && response.status() === 200),
            ]);
        }
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
