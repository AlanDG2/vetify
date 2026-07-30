import { getInstitutionalBaseUrl, SiteId } from '@config/environment';
import { BasePage } from '@pages/BasePage';
import type { Page } from '@playwright/test';
import { PlansSection } from './sections/PlansSection';

export class VetifyInstitutionalPage extends BasePage {
    readonly plans: PlansSection;

    constructor(page: Page) {
        super(page);
        this.plans = new PlansSection(page);
    }

    async load(): Promise<void> {
        await this.page.goto(getInstitutionalBaseUrl(SiteId.VETIFY_ADQUIRENTE));
    }

    async goToSection(sectionId: 'planes' | 'contacto' | 'atencion' | 'footer'): Promise<void> {
        await this.page.locator(`a[href="#${sectionId}"]`).click();
    }
}
