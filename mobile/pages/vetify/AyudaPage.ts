import { $$, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Pantalla sin heading real — el "Ayuda" de la barra superior es un <p>, mismo patrón que el
// título de otras pantallas de este wizard (ej. "Videollamada"). Confirmado en vivo con un dump:
// todo el contenido aparece DUPLICADO en el DOM (2 copias, probablemente una por breakpoint
// responsive con la otra oculta por CSS) — se resuelve tomando la primera copia que esté
// realmente visible, no la primera en orden de documento.
export class VetifyMobileAyudaPage extends VetifyMobileLoggedBasePage {
    async load(): Promise<void> {
        await this.navigateTo('/section/ayuda');
    }

    private async firstVisible(matches: ReturnType<typeof $$>) {
        const elements = await matches;
        for (const el of elements) {
            if (await el.isDisplayed().catch(() => false)) return el;
        }
        return undefined;
    }

    // Confirmado en vivo: un chequeo único a veces corre antes de que la copia visible del par
    // duplicado termine de asentarse (falló intermitente 1/2 veces sin este polling) — mismo
    // patrón de timing ya visto en otras pantallas de este proyecto, se resuelve con
    // browser.waitUntil() en vez de un solo intento.
    async verifyTextVisible(text: string): Promise<void> {
        await browser.waitUntil(async () => Boolean(await this.firstVisible($$(`//p[contains(., "${text}")]`))), {
            timeout: 15_000,
            interval: 1_000,
            timeoutMsg: `No se encontró el texto "${text}" visible en la pantalla de Ayuda tras 15s.`,
        });
    }
}
