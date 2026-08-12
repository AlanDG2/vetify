import { $, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Confirmado en vivo con un dump (`/section/asistencia-domicilio`) — NO es el mismo patrón de
// "contenido duplicado por breakpoint" que AyudaPage.ts/FacturasPage.ts. La pantalla inicial
// muestra 2 opciones ("Escribinos por WhatsApp" / "Llamanos por teléfono") como botones. El texto
// "Teléfono"/"0800 122 1183"/"WhatsApp"/"Ir a WhatsApp" SÍ está en el DOM pero con un ancestro en
// `display: none` que el click NUNCA cambia — no es un drawer/panel inline. Investigado con
// `browser.getCurrentPackage()` tras el click: pasa a `com.google.android.dialer` — "Llamanos por
// teléfono" dispara un intent nativo `tel:` directo (abre el marcador del teléfono), no un cambio
// de UI dentro del WebView. El contenido oculto es casi seguro exclusivo de Desktop (un panel que
// ahí sí se muestra inline) y no relevante para el flujo mobile. Mismo patrón de intent nativo ya
// visto en "Vetify PLUS" (ver decision-log 2026-08-12) — se verifica por `getCurrentPackage()`, no
// por cambios en el DOM. "Escribinos por WhatsApp" no se prueba: el emulador no tiene WhatsApp
// instalado (mismo tipo de gap que Chrome sin first-run).
export class VetifyMobileAsistenciaDomicilioPage extends VetifyMobileLoggedBasePage {
    async load(): Promise<void> {
        await this.navigateTo('/section/asistencia-domicilio');
    }

    get titleLbl() {
        return $('//p[contains(., "Asistencia a domicilio")]');
    }

    get subtitleLbl() {
        return $('//p[contains(., "Asistencia veterinaria a domicilio")]');
    }

    get whatsappOptionBtn() {
        return $('//button[contains(., "Escribinos por WhatsApp")]');
    }

    get telefonoOptionBtn() {
        return $('//button[contains(., "Llamanos por teléfono")]');
    }

    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    async verifyLoaded(): Promise<void> {
        await this.titleLbl.waitForDisplayed({ timeout: 15_000 });
        await this.subtitleLbl.waitForDisplayed({ timeout: 10_000 });
        await this.whatsappOptionBtn.waitForDisplayed({ timeout: 10_000 });
        await this.telefonoOptionBtn.waitForDisplayed({ timeout: 10_000 });
    }

    async openTelefonoDetail(): Promise<void> {
        await this.jsClick(this.telefonoOptionBtn);
    }

    // Se detecta por el paquete de Android en foreground (el marcador del sistema), no por el DOM
    // — confirmado en vivo que "Llamanos por teléfono" abre un intent `tel:` nativo directo.
    async verifyDialerOpened(): Promise<void> {
        await browser.waitUntil(async () => (await browser.getCurrentPackage()).includes('dialer'), {
            timeout: 15_000,
            interval: 1_000,
            timeoutMsg: 'No se abrió el marcador del teléfono tras tocar "Llamanos por teléfono".',
        });
    }
}
