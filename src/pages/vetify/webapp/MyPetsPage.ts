import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import type { Locator, Page } from '@playwright/test';

export class VetifyWebappMyPetsPage extends VetifyWebappLoggedBasePage {
    readonly backButton: Locator;
    readonly addNewPlanBtn: Locator;
    readonly petCards: Locator;
    // Card: Plan without pet
    readonly addPetToPlanBtn: Locator;

    constructor(page: Page) {
        super(page, '/section/mypets');
        this.backButton = this.page.locator('button[data-cy="backButton"]');
        this.addNewPlanBtn = this.page.getByRole('button', { name: 'Suscribir mascota' });
        this.petCards = this.page.locator('button[data-cy="petCredentialCard"]');
        this.addPetToPlanBtn = this.page.getByRole('button', { name: 'Completar credencial' });
    }

    async waitForPageLoaded() {
        await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/users/me') && response.status() === 200),
            this.page.waitForResponse((response) => response.url().includes('/api/services/pets/my-products') && response.status() === 200),
        ]);
    }
}
