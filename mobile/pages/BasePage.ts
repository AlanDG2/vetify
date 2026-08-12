import { $, browser } from '@wdio/globals';
// Trae la ampliación de tipos de 'webdriverio' (getContexts/switchContext, etc.) —
// @wdio/globals por sí solo declara WebdriverIO.Browser vacío.
import type {} from 'webdriverio';

const WEBVIEW_CONTEXT_PATTERN = /WEBVIEW/;

export abstract class BasePage {
    async switchToWebViewContext(): Promise<void> {
        const contexts = await browser.getContexts();
        const webviewContext = contexts.find((context) =>
            WEBVIEW_CONTEXT_PATTERN.test(typeof context === 'string' ? context : context.id),
        );

        if (!webviewContext) {
            throw new Error(`No se encontro contexto WEBVIEW. Contextos disponibles: ${JSON.stringify(contexts)}`);
        }

        await browser.switchContext(typeof webviewContext === 'string' ? webviewContext : webviewContext.id);
    }

    async switchToNativeContext(): Promise<void> {
        await browser.switchContext('NATIVE_APP');
    }

    // Workaround real de IMP-011 (docs/impedimentos-bloqueos.md): setear un <input type="file">
    // directo vía chromedriver (`setValue(hostPath)`) crashea el WebView embebido de esta app.
    // La alternativa que SÍ funciona, confirmada en vivo: tocar el <label> visible que dispara el
    // input (igual que un usuario real) abre el selector nativo de fotos de Android
    // (`com.google.android.providers.media.module`, actividad "Photo Picker" moderna) en vez de
    // pasar por chromedriver — sin crash, y la app recibe el archivo normal al volver al WebView
    // (confirmado: el <img> de preview queda con un blob: URL real).
    //
    // Precondición: la foto a seleccionar debe existir ya en la galería del dispositivo/emulador
    // (adb push + broadcast MEDIA_SCANNER_SCAN_FILE) — este helper no la sube, solo la selecciona
    // de "Recientes". El picker moderno de Android expone cada miniatura como un elemento
    // clickeable con `content-desc="Photo taken on <fecha>"` (confirmado con uiautomator dump) —
    // NO son los `android.widget.ImageView` sueltos (esos son iconos de la toolbar: cerrar, más
    // opciones). Selecciona la más reciente (primer resultado); si se necesita una foto específica
    // entre varias, extender con un selector más preciso en vez de asumir que alcanza con "la
    // primera".
    async selectPhotoViaNativePicker(triggerLabelSelector: string): Promise<void> {
        await this.switchToWebViewContext();
        const trigger = $(triggerLabelSelector);
        await trigger.waitForDisplayed({ timeout: 10_000 });
        // Click vía JS, no nativo — mismo motivo que el resto del proyecto (viewport angosto,
        // intercepción de coordenadas). Ver known-issues.md.
        await browser.execute((node: HTMLElement) => node.click(), await trigger);

        // No hay un elemento del WebView para pollear acá (la app pasa a segundo plano mientras el
        // picker nativo abre) — pausa fija confirmada suficiente en vivo.
        await browser.pause(2_000);
        await this.switchToNativeContext();

        const thumbnail = $('//*[starts-with(@content-desc,"Photo taken on")]');
        await thumbnail.waitForDisplayed({ timeout: 10_000 });
        await thumbnail.click();

        await this.switchToWebViewContext();
    }
}
