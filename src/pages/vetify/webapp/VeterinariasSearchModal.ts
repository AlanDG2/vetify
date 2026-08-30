import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';

export class VetifyWebappVeterinariasSearchModal extends VetifyWebappBasePage {
    readonly heading: Locator;
    readonly closeBtn: Locator;
    readonly locationInput: Locator;
    readonly locationSuggestions: Locator;
    readonly mapRegion: Locator;

    constructor(page: Page) {
        super(page);

        this.heading = page.getByRole('heading', { name: 'Buscar veterinaria' });
        this.closeBtn = page.getByRole('button', { name: 'closeButton' });
        this.locationInput = page.getByRole('combobox', { name: 'Ingresá la ubicación' });
        // Confirmado en vivo 2026-08-30: autocompletado real de Google Places, no una lista propia.
        this.locationSuggestions = page.getByRole('option');
        this.mapRegion = page.getByRole('region', { name: 'Mapa' });
    }

    async searchLocation(query: string): Promise<void> {
        // OJO: esperar mapRegion aca (probado 2026-08-30) cuelga 60s -- el region role "Mapa" no
        // queda disponible de forma confiable vía accesibilidad en el runner real, aunque la
        // interaccion en si funciona sin esperarlo. Se saco esa espera.
        await this.locationInput.click();
        // pressSequentially en vez de fill(): el autocompletado de Google Places escucha eventos de
        // teclado reales tecla por tecla, .fill() dispara un solo evento "input" que no siempre lo
        // activa de forma confiable.
        await this.locationInput.pressSequentially(query, { delay: 100 });
        await this.locationSuggestions.first().waitFor({ state: 'visible', timeout: 30_000 });
    }
}
