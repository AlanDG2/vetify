import { getInstitutionalBaseUrl, SiteId } from '@config/environment';
import { BasePage } from '@pages/BasePage';
import type { Page } from '@playwright/test';
import { PlansSection } from './sections/PlansSection';

export class OsdeAdquirenteInstitutionalPage extends BasePage {
    readonly plans: PlansSection;

    constructor(page: Page) {
        super(page);
        this.plans = new PlansSection(page);
    }

    async load(): Promise<void> {
        await this.page.goto(getInstitutionalBaseUrl(SiteId.OSDE_ADQUIRENTE));
    }

    async waitForPageLoaded(): Promise<void> {
        await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/quantum/jengage/catalog/products?cuenta=MA_VETIFY') && response.status() === 200),
        ]);
    }

    async goToSection(sectionId: 'planes'): Promise<void> {
        await this.page.locator(`a[href="#${sectionId}"]`).click();
    }
}
