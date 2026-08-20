import { $, browser } from '@wdio/globals';
import { UserProvider } from '../../../src/providers/user/user-provider';
import type { TestUser, UserRequest } from '../../../src/providers/user/user-provider';
import { VetifyMobileAppBasePage } from './VetifyMobileAppBasePage';
import { VetifyMobileHomePage } from './HomePage';

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

        // 2026-08-18/19: la sesión de la app persiste entre tests (no hay reset de datos entre
        // corridas) — cada spec asume que arranca en Login, pero si el test anterior dejó una
        // sesión activa este método esperaba 30s por un campo de email que nunca iba a aparecer.
        // El hook `afterTest` (wdio.shared.conf.ts) ya resetea la ruta a `/` después de CADA test
        // (navegación directa dentro del WEBVIEW, liviana) — para cuando este método corre, la app
        // ya está en Home (si sigue logueada) o en Login (si no), nunca a mitad de un wizard/modal
        // de un test anterior. Acá solo hace falta cerrar sesión si corresponde.
        const homePage = new VetifyMobileHomePage();
        const alreadyLoggedIn = await homePage.sideMenuTriggerBtn.isExisting().catch(() => false);
        if (alreadyLoggedIn) {
            await homePage.logout();
            await this.switchToWebViewContext();
        }

        await this.emailInput.waitForDisplayed({ timeout: 30_000 });
        await this.emailInput.setValue(email);
        await this.passwordInput.setValue(password);

        // Click por JS: en cuentas que todavía no aceptaron cookies (o tras un logout que resetea
        // ese estado) el banner de cookies tapa el botón de submit y el tap nativo choca con
        // "element click intercepted" — mismo patrón que LoggedBasePage.openSideMenu().
        const submit = await this.submitButton;
        await browser.execute((node: HTMLElement) => node.click(), submit);
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
