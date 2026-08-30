import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappMyPlansPage extends VetifyWebappLoggedBasePage {
    // Cada plan del usuario es un boton acordeon (nombre del plan) que expande Grupo/Codigo
    // Producto/Condiciones del Servicio -- confirmado en vivo 2026-08-30.
    readonly planButtons: Locator;
    readonly conditionsServiceBtn: Locator;
    readonly noPlansLbl: Locator;

    constructor(page: Page) {
        super(page, '/section/myplans');

        this.planButtons = page.getByRole('button').filter({ hasNotText: 'Volver' });
        this.conditionsServiceBtn = page.getByRole('button', { name: 'Condiciones del Servicio' });
        this.noPlansLbl = page.getByText('No hay planes por el momento.');
    }

    async waitForPageLoaded() {
        await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/users/me') && response.status() === 200),
            this.page.waitForResponse((response) => response.url().includes('/api/services/pets/my-products') && response.status() === 200),
        ]);
    }

    async expandFirstPlan(): Promise<void> {
        await this.planButtons.first().click();
    }
}
