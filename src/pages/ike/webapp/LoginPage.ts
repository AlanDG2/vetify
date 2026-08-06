import type { Locator, Page } from '@playwright/test';
import { IkeWebappBasePage } from './BasePage';

export class IkeWebappLoginPage extends IkeWebappBasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessageLbl: Locator;
    readonly acceptAllCookiesBtn: Locator;

    constructor(page: Page) {
        super(page, '/auth/login');
        // Confirmado vía MCP contra QA real (ikeargentina-qa.ikeapp.com): mismo diseño/estructura que
        // el login de Vetify webapp (probable mismo template de frontend), pero sin atributos `data-cy`
        // visibles en el árbol de accesibilidad — se usan locators por rol/accesible name.
        this.emailInput = this.page.getByRole('textbox', { name: 'Correo electrónico' });
        this.passwordInput = this.page.getByRole('textbox', { name: 'Contraseña' });
        this.submitButton = this.page.getByRole('button', { name: 'Iniciar sesión' });
        // Copy real confirmado: "La contraseña y/o correo electrónico no es válido. ¿No tienes usuario? Crear cuenta."
        this.errorMessageLbl = this.page.getByText('La contraseña y/o correo electrónico no es válido');
        this.acceptAllCookiesBtn = this.page.getByRole('button', { name: 'Aceptar todas' });
    }

    async dismissCookieBannerIfPresent(): Promise<void> {
        if (await this.acceptAllCookiesBtn.isVisible().catch(() => false)) {
            await this.acceptAllCookiesBtn.click();
        }
    }

    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
}
