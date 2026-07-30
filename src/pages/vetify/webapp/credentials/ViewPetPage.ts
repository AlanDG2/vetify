import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import type { Locator, Page } from '@playwright/test';

export class VetifyWebappViewPetPage extends VetifyWebappLoggedBasePage {
    // Page Elements
    readonly avatarImg: Locator;
    readonly petNameLbl: Locator;
    readonly petBreedLbl: Locator;
    readonly petAgeLbl: Locator;
    readonly planNameLbl: Locator;
    readonly backButton: Locator;
    readonly downloadCredentialBtn: Locator;
    // Page Attributes
    private petId: string | undefined;

    constructor(page: Page, petId?: string) {
        super(page, '/section/mypets');
        this.petId = petId;

        this.avatarImg = this.page.locator('img[data-scope="avatar"]');
        this.petNameLbl = this.page.locator('span[data-scope="pet-name"]'); // TODO: Fix this locator
        this.petBreedLbl = this.page.locator('span[data-scope="pet-breed"]'); // TODO: Fix this locator
        this.petAgeLbl = this.page.locator('span[data-scope="pet-age"]'); // TODO: Fix this locator
        this.planNameLbl = this.page.locator('span[data-scope="plan-name"]'); // TODO: Fix this locator
        this.backButton = this.page.locator('button[data-cy="backButton"]');
        this.downloadCredentialBtn = this.page.getByRole('button', { name: 'Bajar credencial' });
    }

    setPetId(petId: string): void {
        this.petId = petId;
    }
}
