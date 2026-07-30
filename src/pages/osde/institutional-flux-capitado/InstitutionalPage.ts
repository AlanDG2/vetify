import { getInstitutionalBaseUrl, SiteId } from '@config/environment';
import { BasePage } from '@pages/BasePage';
import { AcquisitionFormComponent } from '@pages/osde/institutional-flux-capitado/AcquisitionFormComponent';
import type { Page } from '@playwright/test';

export class FluxCapitadoInstitutionalPage extends BasePage {
    readonly form: AcquisitionFormComponent;
    constructor(page: Page) {
        super(page);
        this.form = new AcquisitionFormComponent(page);
    }

    async load(): Promise<void> {
        await this.page.goto(getInstitutionalBaseUrl(SiteId.FLUX_CAPITADO));
    }
}
