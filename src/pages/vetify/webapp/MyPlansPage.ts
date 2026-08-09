import { type Page } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappMyPlansPage extends VetifyWebappLoggedBasePage {
    constructor(page: Page) {
        super(page, '/section/myplans');
    }

    async waitForPageLoaded() {
        await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/users/me') && response.status() === 200),
            this.page.waitForResponse((response) => response.url().includes('/api/services/pets/my-products') && response.status() === 200),
        ]);
    }
}
