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

    // Tour de onboarding (confirmado en vivo 2026-08-30, solo aparece la primera vez que la cuenta
    // se loguea): banner de bienvenida + wizard de 3 pasos con navegación Atrás/Omitir/Continuar.
    readonly tourWelcomeStartBtn: Locator;
    readonly tourBackBtn: Locator;
    readonly tourSkipBtn: Locator;
    readonly tourNextBtn: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.greetingLbl = page.locator('[data-cy="vetifyHomeGreeting"]');

        this.upcomingAppointmentsToggleBtn = page.locator(`//p[contains(text(), 'próximos turnos')]/../../button`);
        this.upcomingVideocallBannerLbl = page.getByText('Tenés una videollamada programada');
        this.goToVideocallDetailBtn = page.getByRole('button', { name: 'Ir al detalle' });

        this.goToVideocallBtn = page.locator('button:text("Ir a videollamada")');

        // 2 elementos con el mismo data-cy (resumen responsive duplicado, el mismo patrón ya visto en
        // CheckoutPage.planQuantitySelect) -- confirmado en vivo 2026-08-30 que el indice 1 es el
        // visible. Los botones de navegación del tour en si (Atrás/Omitir/Continuar) NO están duplicados.
        this.tourWelcomeStartBtn = page.locator('[data-cy="tourWelcomeStart"]').nth(1);
        this.tourBackBtn = page.locator('[data-cy="tourBack"]');
        this.tourSkipBtn = page.locator('[data-cy="tourSkip"]');
        this.tourNextBtn = page.locator('[data-cy="tourNext"]');
    }

    async completeOnboardingTour(): Promise<void> {
        await this.tourWelcomeStartBtn.click();
        // 3 pasos confirmados en vivo -- Continuar 2 veces avanza del paso 1 al 3, la 3ra cierra el tour.
        await this.tourNextBtn.click();
        await this.tourNextBtn.click();
        await this.tourNextBtn.click();
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
