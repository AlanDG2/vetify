import { $, $$ } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Locators calcados de src/pages/vetify/webapp/MyPetsPage.ts (Playwright).
export class VetifyMobileMyPetsPage extends VetifyMobileLoggedBasePage {
    get backButton() {
        return $('button[data-cy="backButton"]');
    }

    get petCards() {
        return $$('button[data-cy="petCredentialCard"]');
    }

    get addNewPlanBtn() {
        return $('//button[contains(., "Suscribir mascota")]');
    }

    get addPetToPlanBtn() {
        return $('//button[contains(., "Completar credencial")]');
    }

    get emptyPlanNoticeLbl() {
        return $('//*[contains(., "Dejá su credencial lista")]');
    }

    async load(): Promise<void> {
        await this.navigateTo('/section/mypets');
    }
}
