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
        // Confirmado en vivo 2026-08-30: el nombre es el <p> hermano del wrapper del avatar
        // (data-part="root", no el <img> en si); Raza/Edad/Plan son pares <p>etiqueta</p><p>valor</p>.
        this.petNameLbl = this.page.locator('[data-scope="avatar"][data-part="root"]').locator('xpath=following-sibling::p[1]');
        this.petBreedLbl = this.page.locator('p:text-is("Raza") + p');
        this.petAgeLbl = this.page.locator('p:text-is("Edad") + p');
        this.planNameLbl = this.page.locator('p:text-is("Plan") + p');
        this.backButton = this.page.locator('button[data-cy="backButton"]');
        this.downloadCredentialBtn = this.page.getByRole('button', { name: 'Bajar credencial' });
    }

    setPetId(petId: string): void {
        this.petId = petId;
    }
}
