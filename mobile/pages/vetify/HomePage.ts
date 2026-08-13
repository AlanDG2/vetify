import { $, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Locator calcado de src/pages/vetify/webapp/HomePage.ts (Playwright).
export class VetifyMobileHomePage extends VetifyMobileLoggedBasePage {
    async load(): Promise<void> {
        await this.navigateTo('/');
    }

    get greetingLbl() {
        return $('[data-cy="vetifyHomeGreeting"]');
    }

    // Real banner confirmado en la versión Playwright (HomePage.ts): "Tenés una videollamada
    // programada" + botón "Ir al detalle" — mismo copy en mobile (mismo sitio).
    get upcomingVideocallBannerLbl() {
        return $('//*[contains(., "Tenés una videollamada programada")]');
    }

    async verifyUpcomingVideocallVisible(): Promise<void> {
        await this.upcomingVideocallBannerLbl.waitForDisplayed({ timeout: 15_000 });
    }

    // Interstitial de bienvenida ("¡Te damos la bienvenida a la nueva Home de Vetify!" +
    // botón "Comenzar") — NO existe en el POM Playwright, encontrado en vivo contra el
    // emulador. Es condicional: depende del estado de la cuenta (algunas cuentas del pool
    // ya completaron el tour, otras no), no es flakiness. Sin dismissearlo, `greetingLbl`
    // nunca queda interactuable. No se encontró data-cy — locator por texto (sin traducción,
    // el copy real está en español).
    get welcomeTourContinueBtn() {
        return $('//button[contains(., "Comenzar")]');
    }

    async dismissWelcomeTourIfPresent(): Promise<void> {
        if (await this.welcomeTourContinueBtn.isExisting()) {
            await this.welcomeTourContinueBtn.click();
        }
    }

    // Banner de cookies ("Usamos cookies y tecnologías similares...") — solo lo ve una cuenta que
    // nunca lo aceptó antes (confirmado en vivo 2026-08-13 con una cuenta Fresh recién registrada:
    // las cuentas pooled reusadas no lo ven porque ya quedó aceptado en su sesión previa vía la
    // cookie `cookie_preferences`). Sin dismissearlo, tapa triggers de otras pantallas (ej. el
    // selector nativo de foto en el wizard de credencial) — mismo tipo de overlap que BUG-009,
    // pero en este trigger puntual en vez del bottom nav.
    get cookieBannerAcceptBtn() {
        return $('//button[contains(., "Aceptar todas")]');
    }

    async dismissCookieBannerIfPresent(): Promise<void> {
        if (await this.cookieBannerAcceptBtn.isExisting()) {
            await browser.execute((el: HTMLElement) => el.click(), await this.cookieBannerAcceptBtn);
        }
    }

    // Pollea en vez de chequear el tour una sola vez al principio: en una sesión de Appium
    // "no-primera" (2da en adelante dentro del mismo proceso del server) la carga es más lenta
    // y el tour puede aparecer DESPUÉS del primer chequeo — una sola verificación al inicio
    // deja pasar esa carrera y el saludo nunca queda interactuable detrás del interstitial.
    //
    // Re-afirma el contexto WEBVIEW en cada iteración (no solo una vez en login()): confirmado
    // vía logcat (2026-08-11, IMP-010) que el proceso de instrumentación de UiAutomator2
    // (io.appium.uiautomator2.server) a veces se reinicia a mitad de sesión — eso resetea el
    // contexto activo a NATIVE_APP en el servidor de Appium sin que este código se entere, y los
    // selectores CSS pensados para el WebView empiezan a fallar con "Unsupported CSS selector"
    // (el motor nativo no entiende `[data-cy="..."]`). Sin este switch defensivo, una vez que
    // pasa esto el test queda colgado esperando un elemento que nunca va a poder resolver.
    async waitForLoaded(): Promise<void> {
        await browser.waitUntil(
            async () => {
                await this.switchToWebViewContext().catch(() => undefined);
                if (await this.welcomeTourContinueBtn.isExisting().catch(() => false)) {
                    await this.welcomeTourContinueBtn.click();
                }
                return this.greetingLbl.isDisplayed().catch(() => false);
            },
            { timeout: 30_000, interval: 1_000, timeoutMsg: 'Home no cargo (saludo no visible) tras 30s, incluso dismisseando el tour si aparecia' },
        );
    }
}
