import { $$, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Confirmado en vivo con un dump: a diferencia de otras pantallas, esta no tiene título ni botón
// "Volver" en la barra superior — solo el contenido (estado vacío en la cuenta usada) y el bottom
// nav. Mismo patrón de contenido duplicado en el DOM que AyudaPage.ts.
export class VetifyMobileFacturasPage extends VetifyMobileLoggedBasePage {
    async load(): Promise<void> {
        await this.navigateTo('/section/mybills');
    }

    private async firstVisible(matches: ReturnType<typeof $$>) {
        const elements = await matches;
        for (const el of elements) {
            if (await el.isDisplayed().catch(() => false)) return el;
        }
        return undefined;
    }

    async verifyEmptyStateVisible(): Promise<void> {
        await browser.waitUntil(async () => Boolean(await this.firstVisible($$('[data-cy="emptyState"]'))), {
            timeout: 15_000,
            interval: 1_000,
            timeoutMsg: 'No se encontró el estado vacío de Facturas visible tras 15s.',
        });
        await browser.waitUntil(async () => Boolean(await this.firstVisible($$('//p[contains(., "No tenés facturas disponibles")]'))), {
            timeout: 10_000,
            interval: 1_000,
            timeoutMsg: 'No se encontró el mensaje de estado vacío de Facturas.',
        });
    }
}
