import { type Page, type Locator } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappServicesPage extends VetifyWebappLoggedBasePage {
    readonly goToVideocallMobileBtn: Locator;
    readonly goToVideocallDesktopBtn: Locator;

    constructor(page: Page) {
        super(page, '/section/servicios');

        this.goToVideocallMobileBtn = page.locator('button:text("Videollamada")');
        this.goToVideocallDesktopBtn = page.locator('button:text("Ir a videollamada")');
    }

    async goToRequestVideocall() {
        const isMobile = false; // TODO: Implement page helper

        if (isMobile) {
            await this.goToVideocallMobileBtn.click();
        } else {
            await this.goToVideocallDesktopBtn.click();
        }
    }
}
