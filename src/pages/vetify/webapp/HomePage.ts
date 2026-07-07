import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappHomePage extends VetifyWebappLoggedBasePage {
    readonly greetingLbl: Locator;

    // Alerts: Videocalls
    readonly upcomingAppointmentsToggleBtn: Locator;

    // Section: "Accesos"
    readonly goToVideocallBtn: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.greetingLbl = page.locator('[data-cy="vetifyHomeGreeting"]');

        this.upcomingAppointmentsToggleBtn = page.locator(`//p[contains(text(), 'próximos turnos')]/../../button`);

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
}
