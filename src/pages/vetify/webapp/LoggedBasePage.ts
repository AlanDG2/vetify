import { type Page, type Locator } from '@playwright/test';
import { VetifyWebAppBasePage } from '@pages/vetify/webapp/BasePage';
import { VetifyWebappSideMenuSection } from './SideMenuSection';

export class VetifyWebAppLoggedBasePage extends VetifyWebAppBasePage {
    readonly sideMenuTriggerDesktopBtn: Locator;
    readonly sideMenuTriggerMobileBtn: Locator;

    readonly sideMenuSection: VetifyWebappSideMenuSection;

    constructor(page: Page, path?: string) {
        super(page, path);

        this.sideMenuTriggerDesktopBtn = page.locator('[data-cy="vetifyMenuButton"]');
        this.sideMenuTriggerMobileBtn = page.locator('[data-cy="vetifyBottomNav-mas"]');
        this.sideMenuSection = new VetifyWebappSideMenuSection(page);
    }

    async openSideMenu() {
        const isMobile = false;

        if (isMobile) {
            await this.sideMenuTriggerMobileBtn.click();
        } else {
            await this.sideMenuTriggerDesktopBtn.click();
        }
    }

}