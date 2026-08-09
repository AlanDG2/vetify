import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { VetifyWebappBasePage } from './BasePage';

// Overlay shown by the app when the whole system is unavailable (IMAS-3860, Escenario 1).
// Confirmed via MCP against QA: plain Chakra UI paragraphs, no data-cy, no interactive
// elements — text-based locators are the only stable option. It fully replaces the app's
// content (no nav, no other elements left on the page), which is why expectNoActions()
// checks the whole page rather than a scoped container.
export class VetifyWebappSystemUnavailableComponent extends VetifyWebappBasePage {
    readonly heading: Locator;
    readonly bodyText: Locator;
    readonly footerText: Locator;

    constructor(page: Page) {
        super(page);
        this.heading = page.getByText('Estamos realizando mejoras');
        this.bodyText = page.getByText('Mientras tanto, si necesitás asistencia, comunicate con nosotros al 0800 122 1183.');
        this.footerText = page.getByText('Gracias por tu paciencia.');
    }

    @step('Verificar que la pantalla de indisponibilidad general es visible')
    async expectVisible(): Promise<void> {
        await expect(this.heading).toBeVisible();
        await expect(this.bodyText).toBeVisible();
        await expect(this.footerText).toBeVisible();
    }

    @step('Verificar que la pantalla de indisponibilidad general no presenta botones ni enlaces')
    async expectNoActions(): Promise<void> {
        await expect(this.page.getByRole('button')).toHaveCount(0);
        await expect(this.page.getByRole('link')).toHaveCount(0);
    }

    @step('Verificar que la pantalla de indisponibilidad general se ocultó')
    async expectHidden(): Promise<void> {
        await expect(this.heading).toBeHidden();
    }
}
