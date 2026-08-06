import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappHomePage extends VetifyWebappLoggedBasePage {
    readonly greetingLbl: Locator;

    // Alerts: Videocalls
    readonly upcomingAppointmentsToggleBtn: Locator;
    // Real banner confirmed against QA (CA08 IMAS-3174/CA10 IMAS-3889): "Tenés una videollamada
    // programada" + "Para el día DD/MM/AA a las HH:MM h." with a "Ir al detalle" button.
    readonly upcomingVideocallBannerLbl: Locator;
    readonly goToVideocallDetailBtn: Locator;

    // Section: "Accesos"
    readonly goToVideocallBtn: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.greetingLbl = page.locator('[data-cy="vetifyHomeGreeting"]');

        this.upcomingAppointmentsToggleBtn = page.locator(`//p[contains(text(), 'próximos turnos')]/../../button`);
        this.upcomingVideocallBannerLbl = page.getByText('Tenés una videollamada programada');
        this.goToVideocallDetailBtn = page.getByRole('button', { name: 'Ir al detalle' });

        this.goToVideocallBtn = page.locator('button:text("Ir a videollamada")');
    }

    async load() {
        await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/services/pets/my-products') && response.status() === 200),
            this.page.waitForResponse((response) => response.url().includes('/api/users/me') && response.status() === 200),
            super.load(),
        ]);
    }

    async waitForPageLoaded() {
        await Promise.all([this.page.waitForResponse((response) => response.url().includes('/api/users/me') && response.status() === 200)]);
    }

    @step('Verificar que el banner de videollamada programada es visible en Home')
    async verifyUpcomingVideocallVisible(): Promise<void> {
        await expect(this.upcomingVideocallBannerLbl).toBeVisible();
        await expect(this.goToVideocallDetailBtn).toBeVisible();
    }
}
