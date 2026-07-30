import { getInstitutionalBaseUrl, SiteId } from '@config/environment';
import { BasePage } from '@pages/BasePage';
import { AcquisitionFormComponent } from '@pages/osde/institutional-osde-capitado/AcquisitionFormComponent';
import type { Locator, Page } from '@playwright/test';

export class OsdeCapitadoInstitutionalPage extends BasePage {
    readonly titleLbl: Locator;
    readonly form: AcquisitionFormComponent;

    constructor(page: Page) {
        super(page);
        this.form = new AcquisitionFormComponent(page);
        this.titleLbl = this.page.getByRole('heading', { name: 'ACTIVÁ HOY EL PLAN DE SALUD' });
    }

    async load(): Promise<void> {
        await Promise.all([this.page.goto(getInstitutionalBaseUrl(SiteId.OSDE_CAPITADO)), this.waitForPageToLoad()]);
    }

    async waitForPageToLoad(): Promise<void> {
        // Wait until titleLbl is displayed
        await this.titleLbl.waitFor({ state: 'visible' });
    }
}
