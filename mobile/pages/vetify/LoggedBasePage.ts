import { $, browser } from '@wdio/globals';
import { VetifyMobileAppBasePage } from './VetifyMobileAppBasePage';
import { VetifyMobileSideMenuSection } from './SideMenuSection';

// Calcado de src/pages/vetify/webapp/LoggedBasePage.ts (Playwright) — el WebView de la app
// siempre es viewport mobile, así que acá no hace falta la rama desktop/mobile del original.
export abstract class VetifyMobileLoggedBasePage extends VetifyMobileAppBasePage {
    readonly sideMenuSection = new VetifyMobileSideMenuSection();

    get sideMenuTriggerBtn() {
        return $('[data-cy="vetifyBottomNav-mas"]');
    }

    async openSideMenu(): Promise<void> {
        // 2026-08-19: en pantallas con un banner encima del bottom nav (ej. Home con "Tenés una
        // videollamada programada" tras agendar/reprogramar) el tap nativo choca con "element
        // click intercepted" — el banner tapa el botón aunque siga siendo el elemento "de arriba"
        // en el DOM. Click por JS (mismo patrón ya usado en VideocallFormPage.jsClick) esquiva el
        // chequeo de superposición visual de WebDriver.
        const el = await this.sideMenuTriggerBtn;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    async logout(): Promise<void> {
        await this.openSideMenu();
        await this.sideMenuSection.logoutBtn.waitForDisplayed({ timeout: 10_000 });
        // Mismo motivo que openSideMenu(): el drawer puede seguir animando su apertura cuando se
        // intenta el click, y el tap nativo por coordenadas falla con "did not become
        // interactable". Click por JS lo esquiva.
        const logoutBtn = await this.sideMenuSection.logoutBtn;
        await browser.execute((node: HTMLElement) => node.click(), logoutBtn);
    }
}
