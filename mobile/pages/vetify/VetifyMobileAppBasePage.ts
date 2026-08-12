import { browser } from '@wdio/globals';
import { getWebappBaseUrl, SiteId } from '../../../src/config/environment';
import { BasePage } from '../BasePage';

// Calcado de src/pages/vetify/webapp/BasePage.ts (Playwright) — navegar por URL dentro del
// WEBVIEW funciona igual que en un browser real una vez logueado (misma sesión/cookies).
export abstract class VetifyMobileAppBasePage extends BasePage {
    protected baseUrl: string = getWebappBaseUrl(SiteId.VETIFY_ADQUIRENTE);

    async navigateTo(path: string): Promise<void> {
        await this.switchToWebViewContext();
        await browser.url(`${this.baseUrl}${path}`);
    }
}
