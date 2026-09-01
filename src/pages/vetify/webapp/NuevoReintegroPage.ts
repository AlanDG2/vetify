import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappNuevoReintegroPage extends VetifyWebappLoggedBasePage {
    readonly noMascotasRegistradasLbl: Locator;

    constructor(page: Page) {
        super(page, '/section/nuevo-reintegro');

        this.noMascotasRegistradasLbl = page.getByText('No hay mascotas registradas para tu documento.');
    }
}
