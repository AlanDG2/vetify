import { $, $$ } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// src/pages/vetify/webapp/MyPlansPage.ts (Playwright) no tiene locators reales todavia — se
// encontraron en vivo contra el emulador (dump de HTML), no existen en el POM Playwright para
// calcar. El item de plan no tiene data-cy (confirmado); se usa la clase semantica estable de
// Chakra (`chakra-accordion__itemTrigger`, sin hash de build) en vez de la clase con hash.
export class VetifyMobileMyPlansPage extends VetifyMobileLoggedBasePage {
    get backButton() {
        return $('button[data-cy="goBack"]');
    }

    get planAccordionItems() {
        return $$('.chakra-accordion__itemTrigger');
    }

    async load(): Promise<void> {
        await this.navigateTo('/section/myplans');
    }
}
