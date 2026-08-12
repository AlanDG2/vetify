import { browser, expect } from '@wdio/globals';
import { BasePage } from '../../pages/BasePage';

class SmokePage extends BasePage {}
const smokePage = new SmokePage();

describe('TS-01 Smoke', () => {
    it('TC-01 - Mobile App - instala y abre la app en el dispositivo', async () => {
        const contexts = await browser.getContexts();
        expect(contexts).toContain('NATIVE_APP');
    });

    // NOTA [IMP-009]: este build (release, no debuggable) solo expone WEBVIEW_* en un
    // dispositivo/emulador con SO Android "userdebug" (ro.debuggable=1, caso de las imagenes
    // "google_apis" del emulador) — en un celular real "user" (ro.debuggable=0) este mismo
    // apk NO expone WEBVIEW_* (MainActivity.java gatea setWebContentsDebuggingEnabled() detrás
    // de BuildConfig.DEBUG). Corre en emulador; en celular fisico sigue bloqueado hasta
    // conseguir un build Debug real. Ver IMP-009 en docs/impedimentos-bloqueos.md.
    it('TC-02 - Mobile App - expone un contexto WEBVIEW sobre el sitio', async () => {
        await browser.waitUntil(
            async () => {
                const contexts = await browser.getContexts();
                return contexts.length > 1;
            },
            { timeout: 20_000, timeoutMsg: 'No aparecio ningun contexto WEBVIEW en 20s tras el launch' },
        );

        await smokePage.switchToWebViewContext();
        const url = await browser.getUrl();
        console.log(`[TS-01 TC-02] URL cargada dentro del WebView: ${url}`);
        expect(url).toContain('ikeapp.com');
    });
});
