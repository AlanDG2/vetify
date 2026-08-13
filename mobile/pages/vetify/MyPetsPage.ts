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

    // Pantalla de detalle (SPA, no cambia la URL — confirmado con getUrl() en vivo, la ruta se
    // mantiene en /section/mypets pese a mostrar los datos completos de la mascota). Raza/Edad
    // siguen el mismo patrón "label + valor en <p> hermano" que otras pantallas de este proyecto
    // (ver reviewMascotaLbl en VideocallFormPage.ts) — confirmado con un dump en vivo.
    get petDetailBreedLbl() {
        return $('//p[contains(., "Raza")]/following-sibling::p[1]');
    }

    get petDetailAgeLbl() {
        return $('//p[contains(., "Edad")]/following-sibling::p[1]');
    }

    async load(): Promise<void> {
        await this.navigateTo('/section/mypets');
    }
}
