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
    // La alternativa que SÍ funciona, confirmada en vivo: tocar el elemento VISIBLE que dispara el
    // input (igual que un usuario real) abre un selector nativo de Android en vez de pasar por
    // chromedriver — sin crash, y la app recibe el archivo normal al volver al WebView (confirmado
    // en 3 pantallas: el <img>/preview queda con un blob: URL real).
    //
    // Dos selectores nativos distintos según el/los `accept` del input, ambos manejados acá:
    //  - `accept="image/*"` (foto de mascota, avatar de perfil) → el moderno Photo Picker
    //    (`com.google.android.providers.media.module`) — miniaturas como `content-desc="Photo
    //    taken on <fecha>"` (confirmado con uiautomator dump).
    //  - `accept` con más de un tipo (imagen+video+pdf, adjuntos de videollamada) → el selector de
    //    archivos completo / Storage Access Framework (`com.google.android.documentsui`) —
    //    tarjetas clickeables con `resource-id=".../item_root"`.
    //
    // El trigger real y la forma de tocarlo también varían por pantalla — no siempre es un
    // <label for="...">: en el paso de foto de mascota sí lo es; en el avatar de perfil el input
    // no tiene label, el trigger real es el propio `div[data-scope="avatar"][data-part="root"]`
    // (clickear el contenedor del input no dispara nada); y en adjuntos de videollamada (dropzone
    // sin label ni data-scope) ningún evento sintético (click JS, ni siquiera una secuencia
    // pointerdown/mousedown/pointerup/mouseup/click completa) lo dispara — hace falta un tap NATIVO
    // real. Por eso este helper prueba click JS primero (más barato, funciona en 2 de 3 pantallas)
    // y si el paquete no cambió, cae a `.click()` nativo de WebdriverIO — verificar en vivo cuál
    // hace falta antes de asumirlo en una pantalla nueva.
    //
    // Precondición: el archivo a seleccionar debe existir ya en la galería/almacenamiento del
    // dispositivo/emulador (adb push + broadcast MEDIA_SCANNER_SCAN_FILE) — este helper no lo
    // sube, solo lo selecciona de "Recientes". Selecciona siempre el primer resultado; si se
    // necesita un archivo específico entre varios, extender con un selector más preciso en vez de
    // asumir que alcanza con "el primero".
    async selectFileViaNativePicker(triggerSelector: string): Promise<void> {
        await this.switchToWebViewContext();
        const trigger = $(triggerSelector);
        await trigger.waitForDisplayed({ timeout: 10_000 });
        const appPackage = await browser.getCurrentPackage();

        await browser.execute((node: HTMLElement) => node.click(), await trigger);
        // No hay un elemento del WebView para pollear acá (la app pasa a segundo plano mientras el
        // picker nativo abre) — pausa fija confirmada suficiente en vivo.
        await browser.pause(2_000);

        if ((await browser.getCurrentPackage()) === appPackage) {
            // El click JS no disparó nada (seguimos en la app) -- reintentar con un tap nativo.
            await trigger.click();
            await browser.pause(2_000);
        }

        await this.switchToNativeContext();

        const nativePackage = await browser.getCurrentPackage();
        const picker =
            nativePackage === 'com.google.android.documentsui'
                ? $('//*[@resource-id="com.google.android.documentsui:id/item_root"]')
                : $('//*[starts-with(@content-desc,"Photo taken on")]');
        await picker.waitForDisplayed({ timeout: 10_000 });
        await picker.click();

        await this.switchToWebViewContext();
    }
}
