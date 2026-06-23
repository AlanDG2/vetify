import type { Page } from '@playwright/test';
import { siteBaseUrls } from '@config/environment';
import { BasePage } from '@pages/BasePage';
import { PlansSection } from './sections/PlansSection';

export class VetifyInstitutionalPage extends BasePage {
  readonly plans: PlansSection;

  constructor(page: Page) {
    super(page);
    this.plans = new PlansSection(page);
  }

  async load(): Promise<void> {
    await this.page.goto(siteBaseUrls.vetifyInstitutional);
  }

  async goToSection(sectionId: 'planes' | 'contacto' | 'atencion' | 'footer'): Promise<void> {
    await this.page.locator(`a[href="#${sectionId}"]`).click();
  }
}
