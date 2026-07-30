import type { Page } from '@playwright/test';
import { getInstitutionalBaseUrl, SiteId } from '@config/environment';
import { BasePage } from '@pages/BasePage';
import { PlansSection } from './sections/PlansSection';

export class OsdeAdquirienteInstitutionalPage extends BasePage {
    readonly plans: PlansSection;

    constructor(page: Page) {
        super(page);
        this.plans = new PlansSection(page);
    }

    async load(): Promise<void> {
        await this.page.goto(getInstitutionalBaseUrl(SiteId.OSDE_ADQUIRENTE));
    }

    async goToSection(sectionId: 'planes'): Promise<void> {
        await this.page.locator(`a[href="#${sectionId}"]`).click();
    }
}
