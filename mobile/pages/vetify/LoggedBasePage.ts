import { $ } from '@wdio/globals';
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
        await this.sideMenuTriggerBtn.click();
    }

    async logout(): Promise<void> {
        await this.openSideMenu();
        await this.sideMenuSection.logoutBtn.waitForDisplayed({ timeout: 10_000 });
        await this.sideMenuSection.logoutBtn.click();
    }
}
